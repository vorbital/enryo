import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { api } from '../lib/api';
import MessageItem from '../components/MessageItem';
import type { MessageWithAuthor } from '../lib/api';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';

export default function ChatPage() {
  const { channelId } = useParams<{ channelId: string }>();
  const { token } = useAuthStore();
  const { setCurrentChannel, currentChannel } = useAppStore();
  const [messages, setMessages] = useState<MessageWithAuthor[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (channelId && token) {
      api.channels.get(token, channelId).then(setCurrentChannel).catch(console.error);
      api.channels.messages(token, channelId).then((msgs) => {
        setMessages(msgs.reverse());
      }).catch(console.error);
    }
  }, [channelId, token]);

  useEffect(() => {
    if (!token) return;

    const socket = new WebSocket(`${WS_URL}/ws?token=${token}`);
    
    socket.onopen = () => {
      console.log('WebSocket connected');
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'message' && msg.channel_id === channelId) {
        setMessages((prev) => [...prev, {
          id: msg.message_id,
          channel_id: msg.channel_id,
          author_id: msg.author_id,
          content: msg.content,
          is_pertinent: msg.is_pertinent,
          parent_id: null,
          created_at: msg.created_at,
          author_name: msg.author_name,
          author_avatar: null,
        }]);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [token, channelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !channelId || !token) return;

    try {
      const message = await api.channels.createMessage(token, channelId, newMessage);
      setMessages((prev) => [...prev, message]);
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const pertinentMessages = messages.filter((m) => m.is_pertinent);
  const offTopicMessages = messages.filter((m) => !m.is_pertinent);

  return (
    <div className="flex-1 flex flex-col">
      {currentChannel && (
        <div className="p-4 border-b border-[#2a2a4a]">
          <h3 className="font-semibold"># {currentChannel.name}</h3>
          {currentChannel.topic && (
            <p className="text-sm text-gray-400">{currentChannel.topic}</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {pertinentMessages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        
        {offTopicMessages.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#2a2a4a]">
            <p className="text-xs text-gray-500 mb-2">
              {offTopicMessages.length} less relevant message{offTopicMessages.length > 1 ? 's' : ''}
            </p>
            {offTopicMessages.map((message) => (
              <MessageItem key={message.id} message={message} truncated />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSend} className="p-4 border-t border-[#2a2a4a]">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Send a message..."
          className="w-full px-4 py-2 bg-[#2a2a4a] rounded focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
        />
      </form>
    </div>
  );
}
