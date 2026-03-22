import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { api } from '../lib/api';
import MessageItem from '../components/MessageItem';
import ContextMenu from '../components/ContextMenu';
import type { MessageWithAuthor } from '../lib/api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export default function ChatPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const { token } = useAuthStore();
  const { setCurrentChannel, currentChannel } = useAppStore();
  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOffTopic, setShowOffTopic] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageWithAuthor | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (channelId && token) {
      setIsLoading(true);
      Promise.all([
        api.channels.get(token, channelId).then(setCurrentChannel).catch(console.error),
        api.channels.messages(token, channelId).then((msgs) => {
          setMessages(msgs.reverse());
        }).catch(console.error),
      ]).finally(() => setIsLoading(false));
    }
  }, [channelId, token]);

  useEffect(() => {
    if (!token || !channelId) return;

    const connect = () => {
      const socket = new WebSocket(`${WS_URL}/ws?token=${token}`);
      wsRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        socket.send(JSON.stringify({
          type: 'subscribe',
          channelId: channelId,
        }));
      };

      socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'message' && msg.channel_id === channelId) {
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
            setMessages((prev) => [...prev, newMsg]);
          }
        } catch (e) {
          console.error('Failed to parse message:', e);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(connect, 3000);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [token, channelId]);

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

  const pertinentMessages = messages.filter((m) => m.is_pertinent);
  const offTopicMessages = messages.filter((m) => !m.is_pertinent);

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

  const contextMenuItems = contextMenu && selectedMessage ? [
    { label: 'Copy message', onClick: () => handleCopyMessage(selectedMessage) },
    { 
      label: 'Copy selected text', 
      onClick: handleCopySelection,
      disabled: !window.getSelection()?.toString() 
    },
  ] : contextMenu ? [
    { label: 'Copy selected text', onClick: handleCopySelection },
  ] : [];

  return (
    <div className="flex-1 flex flex-col bg-[#1a1a2e]">
      {currentChannel && (
        <div className="p-4 border-b border-[#2a2a4a] flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-white flex items-center gap-2">
              <span className="text-gray-500">#</span>
              {currentChannel.name}
            </h3>
            {currentChannel.topic && (
              <p className="text-sm text-gray-400">{currentChannel.topic}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-500">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-gray-500">Loading messages...</div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-4xl mb-4">#</div>
              <p className="text-gray-500">No messages yet</p>
              <p className="text-sm text-gray-600">Be the first to send a message!</p>
            </div>
          </div>
        ) : (
          <>
            {pertinentMessages.map((message) => (
              <div key={message.id} onContextMenu={(e) => handleContextMenu(e, message)}>
                <MessageItem message={message} />
              </div>
            ))}
            
            {offTopicMessages.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#2a2a4a]">
                <button 
                  onClick={() => setShowOffTopic(!showOffTopic)}
                  className="w-full text-left mb-2 px-2 py-1.5 rounded hover:bg-[#2a2a4a] transition-colors flex items-center gap-2"
                >
                  <span className={`transform transition-transform ${showOffTopic ? 'rotate-90' : ''}`}>
                    ▶
                  </span>
                  <span className="text-xs text-gray-400">
                    {offTopicMessages.length} less relevant message{offTopicMessages.length > 1 ? 's' : ''}
                  </span>
                </button>
                {showOffTopic && offTopicMessages.map((message) => (
                  <div key={message.id} onContextMenu={(e) => handleContextMenu(e, message)}>
                    <MessageItem message={message} isTruncated />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-[#2a2a4a]">
        <div className="relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            className="w-full px-4 py-3 bg-[#2a2a4a] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#00d9ff]/50 text-white placeholder-gray-500"
            disabled={!isConnected}
          />
          {newMessage.trim() && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500">
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
    </div>
  );
}
