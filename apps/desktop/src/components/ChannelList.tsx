import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { api, type Channel } from '../lib/api';
import ContextMenu from './ContextMenu';
import EditChannelDialog from './EditChannelDialog';

export default function ChannelList() {
  const { token } = useAuthStore();
  const { currentWorkspace, setCurrentChannel } = useAppStore();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; channel: Channel } | null>(null);
  const [editDialog, setEditDialog] = useState<{ mode: 'rename' | 'topic'; channel: Channel } | null>(null);
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
      const channel = await api.workspaces.createChannel(
        token, 
        currentWorkspace.slug, 
        newName, 
        newTopic || undefined
      );
      setChannels([...channels, channel]);
      setNewName('');
      setNewTopic('');
      setShowCreate(false);
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  const handleCancel = () => {
    setShowCreate(false);
    setNewName('');
    setNewTopic('');
  };

  const handleContextMenu = (e: React.MouseEvent, channel: Channel) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, channel });
  };

  const handleUpdateChannel = async (channel: Channel, mode: 'rename' | 'topic', newValue: string) => {
    if (!token) return;
    
    try {
      const updateData = mode === 'rename' ? { name: newValue } : { topic: newValue };
      const updatedChannel = await api.workspaces.updateChannel(token, channel.id, updateData);
      setChannels(prev => prev.map(c => 
        c.id === channel.id ? updatedChannel : c
      ));
      if (channel.id === useAppStore.getState().currentChannel?.id) {
        setCurrentChannel(updatedChannel);
      }
    } catch (err) {
      console.error('Failed to update channel:', err);
    }
  };

  return (
    <div className="flex flex-col flex-1 overflow-y-auto">
      <div className="px-2 py-4">
        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-2 mb-2">
          Channels
        </h4>
        
        {channels.map((channel) => (
          <div
            key={channel.id}
            onContextMenu={(e) => handleContextMenu(e, channel)}
          >
            <button
              onClick={() => {
                setCurrentChannel(channel);
                navigate(`/channel/${channel.id}`);
              }}
              className="w-full text-left px-2 py-1 rounded text-gray-300 hover:bg-[#2a2a4a] hover:text-white flex items-center gap-2 transition-colors"
            >
              <span className="text-gray-500">#</span>
              <span className="truncate">{channel.name}</span>
            </button>
          </div>
        ))}
        
        {showCreate ? (
          <form onSubmit={handleCreate} className="px-2 mt-1 space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="channel-name"
              className="w-full px-2 py-1 text-sm bg-[#2a2a4a] rounded focus:outline-none focus:ring-1 focus:ring-[#00d9ff] text-white placeholder-gray-500"
              autoFocus
            />
            <input
              type="text"
              value={newTopic}
              onChange={(e) => setNewTopic(e.target.value)}
              placeholder="topic (optional)"
              className="w-full px-2 py-1 text-sm bg-[#2a2a4a] rounded focus:outline-none focus:ring-1 focus:ring-[#00d9ff] text-white placeholder-gray-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-2 py-1 text-xs bg-[#00d9ff] text-black rounded font-medium hover:bg-[#00b8d9]"
              >
                Create
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="px-2 py-1 text-xs text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
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

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={[
            { 
              label: 'Rename', 
              onClick: () => setEditDialog({ mode: 'rename', channel: contextMenu.channel })
            },
            { 
              label: 'Edit topic', 
              onClick: () => setEditDialog({ mode: 'topic', channel: contextMenu.channel })
            },
          ]}
          onClose={() => setContextMenu(null)}
        />
      )}

      <EditChannelDialog
        isOpen={!!editDialog}
        mode={editDialog?.mode || 'rename'}
        currentValue={editDialog?.mode === 'rename' ? editDialog.channel.name : (editDialog?.channel.topic || '')}
        onSave={(newValue) => {
          if (editDialog) {
            handleUpdateChannel(editDialog.channel, editDialog.mode, newValue);
          }
        }}
        onClose={() => {
          setEditDialog(null);
          setContextMenu(null);
        }}
      />
    </div>
  );
}
