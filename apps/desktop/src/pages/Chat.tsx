import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { api } from '../lib/api';
import MessageItem from '../components/MessageItem';
import ContextMenu from '../components/ContextMenu';
import ConfirmDialog from '../components/ConfirmDialog';
import type { MessageWithAuthor } from '../lib/api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export default function ChatPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const { token, userId } = useAuthStore();
  const { setCurrentChannel, currentChannel } = useAppStore();

  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithAuthor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MessageWithAuthor | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  const maxReconnectDelay = 30000; // 30 seconds max delay
  const baseReconnectDelay = 1000; // 1 second base delay

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Load channel info and messages on channel change
  useEffect(() => {
    if (!channelId || !token) {
      setMessages([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isMounted = true;
    const loadChannel = async () => {
      try {
        const [channel, msgs] = await Promise.all([
          api.channels.get(token, channelId),
          api.channels.messages(token, channelId),
        ]);
        if (isMounted) {
          setCurrentChannel(channel);
          setMessages(msgs.reverse());
        }
      } catch (err) {
        console.error('Failed to load channel:', err);
        if (isMounted) {
          setMessages([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadChannel();

    return () => {
      isMounted = false;
    };
  }, [channelId, token]);

  // Connection logic
  useEffect(() => {
    isMountedRef.current = true;
    if (!token || !channelId) {
      setIsConnected(false);
      return;
    }

    // Clean up previous connection
    const oldWs = wsRef.current;
    if (oldWs) {
      wsRef.current = null;
      oldWs.close();
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = 0;

    let isChannelActive = true;
    const connect = () => {
      // Check if we should still attempt to connect
      if (!isMountedRef.current || !isChannelActive) {
        return;
      }

      if (!token) {
        setIsConnected(false);
        return;
      }

      if (!channelId) {
        setIsConnected(false);
        return;
      }

      const wsUrl = `${WS_URL}/ws?token=${token}`;

      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          setIsConnected(true);
          reconnectAttemptsRef.current = 0; // Reset reconnect counter on successful connection
          socket.send(JSON.stringify({
            type: 'subscribe',
            channelId: channelId,
          }));
        };

        socket.onmessage = (event) => {
          if (!isMountedRef.current || !isChannelActive) {
            return;
          }
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'message' && msg.channel_id === channelId) {
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.message_id)) {
                  return prev;
                }
                const newMsg: MessageWithAuthor = {
                  id: msg.message_id,
                  channel_id: msg.channel_id,
                  author_id: msg.author_id,
                  content: msg.content,
                  is_pertinent: msg.is_pertinent,
                  parent_id: null,
                  created_at: msg.created_at,
                  author_name: msg.author_name || 'Unknown',
                  author_avatar: null,
                };
                return [...prev, newMsg];
              });
            }
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        };

        socket.onclose = () => {
          if (!isMountedRef.current || !isChannelActive) {
            return;
          }
          setIsConnected(false);
          // Exponential backoff with jitter
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(
            maxReconnectDelay,
            baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current) + Math.random() * 1000
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          // onclose will handle reconnection
          if (isMountedRef.current && isChannelActive && wsRef.current === socket) {
            wsRef.current.close();
          }
        };
      } catch (err) {
        console.error('Failed to create WebSocket:', err);
        if (isMountedRef.current && isChannelActive) {
          setIsConnected(false);
          // Still attempt to reconnect even if creation fails
          reconnectAttemptsRef.current += 1;
          const delay = Math.min(
            maxReconnectDelay,
            baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current) + Math.random() * 1000
          );
          reconnectTimeoutRef.current = setTimeout(connect, delay);
        }
      }
    };

    connect();

    return () => {
      isChannelActive = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, channelId]);

  // Rest of the component remains the same...

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId || !token || !wsRef.current) return;

    try {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'send_message',
          channelId: channelId,
          content: newMessage,
        }));
      } else {
        const message = await api.channels.createMessage(token, channelId, newMessage);
        setMessages((prev) => [...prev, message]);
      }
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e);
    }
  };

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const handleContextMenu = (e: React.MouseEvent, message?: MessageWithAuthor) => {
    e.preventDefault();
    setSelectedMessage(message || null);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCopySelection = () => {
    const selection = window.getSelection()?.toString();
    if (selection) {
      navigator.clipboard.writeText(selection);
    } else if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.content);
    }
    setContextMenu(null);
  };

  const handleCopyMessage = (message: MessageWithAuthor) => {
    navigator.clipboard.writeText(message.content);
    setContextMenu(null);
  };

  const handleDeleteMessage = (message: MessageWithAuthor) => {
    setDeleteConfirm(message);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm || !token || !channelId) return;
    try {
      await api.channels.deleteMessage(token, channelId, deleteConfirm.id);
      setMessages((prev) => prev.filter((m) => m.id !== deleteConfirm.id));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const contextMenuItems = contextMenu && selectedMessage ? [
    { label: 'Copy message', onClick: () => handleCopyMessage(selectedMessage) },
    { 
      label: 'Copy selected text', 
      onClick: handleCopySelection,
      disabled: !window.getSelection()?.toString() 
    },
    ...(selectedMessage.author_id === userId ? [
      { 
        label: 'Delete', 
        onClick: () => handleDeleteMessage(selectedMessage),
        danger: true,
      },
    ] : []),
  ] : contextMenu ? [
    { label: 'Copy selected text', onClick: handleCopySelection },
  ] : [];

  return (
    <div className="h-full flex flex-col bg-[var(--bg-primary)]">
      {currentChannel && (
        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
              <span className="text-[var(--text-muted)]">#</span>
              {currentChannel.name}
            </h3>
            {currentChannel.topic && (
              <p className="text-sm text-[var(--text-muted)]">{currentChannel.topic}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-[var(--text-muted)]">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-[var(--text-muted)]">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4 text-[var(--ws-primary-400)]">#</div>
              <p className="text-[var(--text-muted)]">No messages yet</p>
              <p className="text-sm text-[var(--text-muted)]">Be the first to send a message!</p>
            </div>
          </div>
        ) : (
          <>
            {sortedMessages.map((message) => (
              <div key={message.id} onContextMenu={(e) => handleContextMenu(e, message)}>
                <MessageItem message={message} />
              </div>
            ))}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-[var(--border-color)] flex-shrink-0">
        <div className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="w-full px-4 py-3 bg-[var(--bg-secondary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--ws-primary-500)]/50 text-[var(--text-primary)] placeholder-[var(--text-muted)]"
            disabled={!isConnected}
          />
          {newMessage.trim() && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[var(--text-muted)]">
              Enter to send
            </span>
          )}
        </div>
      </form>

      {contextMenu && contextMenuItems.length > 0 && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}

      <ConfirmDialog
        isOpen={!!deleteConfirm}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onClose={() => setDeleteConfirm(null)}
        danger
      />
    </div>
  );
}
