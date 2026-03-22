import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { api } from '../lib/api';
import WorkspaceList from '../components/WorkspaceList';
import ChannelList from '../components/ChannelList';

const WORKSPACE_WIDTH = 64;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 240;

export default function MainLayout() {
  const { token } = useAuthStore();
  const { setWorkspaces, setCurrentWorkspace, currentWorkspace } = useAppStore();
  const navigate = useNavigate();
  
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, e.clientX - WORKSPACE_WIDTH));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="flex h-screen bg-[#1a1a2e]">
      <div className="w-16 bg-[#111] flex flex-col items-center py-3 space-y-2 flex-shrink-0">
        <WorkspaceList />
      </div>
      
      <div className="relative flex-shrink-0" style={{ width: sidebarWidth }}>
        <div className="h-full bg-[#1a1a2e] border-r border-[#2a2a4a] flex flex-col">
          <div className="p-4 border-b border-[#2a2a4a]">
            <h2 className="font-semibold truncate">{currentWorkspace?.name || 'Select Workspace'}</h2>
          </div>
          <ChannelList />
        </div>
        
        <div 
          className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors z-10 ${
            isResizing ? 'bg-[#00d9ff]' : 'hover:bg-[#00d9ff]/50'
          }`}
          onMouseDown={handleMouseDown}
        />
      </div>
      
      <div className="flex-1 flex flex-col min-w-0">
        <Outlet />
      </div>
    </div>
  );
}
