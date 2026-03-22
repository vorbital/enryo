import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { api, type Channel } from '../lib/api';

export default function ChannelList() {
  const { token } = useAuthStore();
  const { currentWorkspace, setCurrentChannel } = useAppStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (currentWorkspace && token) {
      api.workspaces.channels(token, currentWorkspace.slug).then(setChannels).catch(console.error);
    }
  }, [currentWorkspace, token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !currentWorkspace || !token) return;

    try {
      const channel = await api.workspaces.createChannel(token, currentWorkspace.slug, newName);
      setChannels([...channels, channel]);
      setNewName('');
      setShowCreate(false);
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <div className="px-2 py-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Channels
        </h4>
        
        {channels.map((channel) => (
          <button
            key={channel.id}
            onClick={() => {
              setCurrentChannel(channel);
              navigate(`/channel/${channel.id}`);
            }}
            className="w-full text-left px-2 py-1 rounded text-gray-300 hover:bg-[#2a2a4a] hover:text-white flex items-center gap-2 transition-colors"
          >
            <span className="text-gray-500">#</span>
            <span className="truncate">{channel.name}</span>
          </button>
        ))}
        
        {showCreate ? (
          <form onSubmit={handleCreate} className="px-2 mt-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="channel-name"
              className="w-full px-2 py-1 text-sm bg-[#2a2a4a] rounded focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
              autoFocus
              onBlur={() => setShowCreate(false)}
            />
          </form>
        ) : (
          <button
            onClick={() => setShowCreate(true)}
            className="w-full text-left px-2 py-1 rounded text-gray-400 hover:bg-[#2a2a4a] hover:text-white flex items-center gap-2 transition-colors"
          >
            <span className="text-gray-500">+</span>
            <span className="text-sm">Add Channel</span>
          </button>
        )}
      </div>
    </div>
  );
}
