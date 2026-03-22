import { Outlet, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { api } from '../lib/api';
import WorkspaceList from '../components/WorkspaceList';
import ChannelList from '../components/ChannelList';

export default function MainLayout() {
  const { token } = useAuthStore();
  const { setWorkspaces, setCurrentWorkspace, currentWorkspace } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      api.workspaces.list(token).then((workspaces) => {
        setWorkspaces(workspaces);
        if (workspaces.length > 0 && !currentWorkspace) {
          setCurrentWorkspace(workspaces[0]);
        }
      }).catch(() => {
        useAuthStore.getState().logout();
        navigate('/');
      });
    }
  }, [token]);

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <div className="w-16 bg-[#111] flex flex-col items-center py-3 space-y-2">
        <WorkspaceList />
      </div>
      
      <div className="w-60 bg-[#1a1a2e] border-r border-[#2a2a4a]">
        <div className="p-4 border-b border-[#2a2a4a]">
          <h2 className="font-semibold truncate">{currentWorkspace?.name || 'Select Workspace'}</h2>
        </div>
        <ChannelList />
      </div>
      
      <div className="flex-1 flex flex-col">
        <Outlet />
      </div>
    </div>
  );
}
