import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { api } from '../lib/api';

export default function WorkspaceList() {
  const { workspaces, currentWorkspace, setCurrentWorkspace, setWorkspaces } = useAppStore();
  const { token } = useAuthStore();
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const navigate = useNavigate();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !token) return;

    const slug = newName.toLowerCase().replace(/\s+/g, '-');
    try {
      const workspace = await api.workspaces.create(token, newName, slug);
      setWorkspaces([...workspaces, workspace]);
      setCurrentWorkspace(workspace);
      setNewName('');
      setShowCreate(false);
      navigate('/');
    } catch (err) {
      console.error('Failed to create workspace:', err);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-2 flex-1">
      {workspaces.map((ws) => (
        <button
          key={ws.id}
          onClick={() => setCurrentWorkspace(ws)}
          className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
            currentWorkspace?.id === ws.id
              ? 'bg-[#00d9ff] text-[#1a1a2e]'
              : 'bg-[#2a2a4a] text-gray-300 hover:bg-[#3a3a5a]'
          }`}
          title={ws.name}
        >
          {ws.name.charAt(0).toUpperCase()}
        </button>
      ))}
      
      {showCreate ? (
        <form onSubmit={handleCreate} className="w-full px-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Name"
            className="w-full px-2 py-1 text-sm bg-[#2a2a4a] rounded mb-1 focus:outline-none focus:ring-1 focus:ring-[#00d9ff]"
            autoFocus
            onBlur={() => setShowCreate(false)}
          />
        </form>
      ) : (
        <button
          onClick={() => setShowCreate(true)}
          className="w-10 h-10 rounded-full bg-[#2a2a4a] text-gray-400 hover:bg-[#3a3a5a] hover:text-white flex items-center justify-center transition-colors"
          title="Add Workspace"
        >
          +
        </button>
      )}
    </div>
  );
}
