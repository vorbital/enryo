import { useState, useEffect, useCallback } from 'react';
import { Outlet, useNavigate, useParams, Link } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { useThemeStore } from '../stores/theme';
import { api } from '../lib/api';
import WorkspaceList from '../components/WorkspaceList';
import ChannelList from '../components/ChannelList';
import WorkspaceThemeProvider from '../components/WorkspaceTheme';

const WORKSPACE_WIDTH = 64;
const MIN_WIDTH = 180;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 240;

export default function MainLayout() {
  const { token } = useAuthStore();
  const { setWorkspaces, setCurrentWorkspace, currentWorkspace } = useAppStore();
  const navigate = useNavigate();
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  
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

  useEffect(() => {
    if (workspaceSlug && token) {
      const ws = useAppStore.getState().workspaces.find(w => w.slug === workspaceSlug);
      if (ws) {
        setCurrentWorkspace(ws);
      } else {
        api.workspaces.get(token, workspaceSlug).then(ws => {
          setCurrentWorkspace(ws);
        }).catch(() => {
          const workspaces = useAppStore.getState().workspaces;
          if (workspaces.length > 0) {
            setCurrentWorkspace(workspaces[0]);
            navigate(`/workspace/${workspaces[0].slug}/channel/general`, { replace: true });
          }
        });
      }
    }
  }, [workspaceSlug, token]);

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

  const { mode, toggleMode } = useThemeStore();

  return (
    <WorkspaceThemeProvider>
      <div className="flex h-screen bg-[var(--bg-primary)]" data-workspace-slug={workspaceSlug}>
        <div className="w-16 bg-[var(--bg-tertiary)] flex flex-col items-center py-3 space-y-2 flex-shrink-0">
          <WorkspaceList />
        </div>
        
        <div className="relative flex-shrink-0" style={{ width: sidebarWidth }}>
          <div className="h-full bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
              <h2 className="font-semibold truncate text-[var(--text-primary)]">{currentWorkspace?.name || 'Select Workspace'}</h2>
              <div className="flex items-center gap-2">
                {workspaceSlug && (
                  <Link
                    to={`/workspace/${workspaceSlug}/settings`}
                    className="p-1 rounded hover:bg-[var(--hover-bg)] text-sm"
                    title="Workspace Settings"
                  >
                    ⚙️
                  </Link>
                )}
                <button
                  onClick={toggleMode}
                  className="p-1 rounded hover:bg-[var(--hover-bg)] text-sm"
                  title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                >
                  {mode === 'dark' ? '☀️' : '🌙'}
                </button>
              </div>
            </div>
            <ChannelList />
          </div>
          
          <div 
            className={`absolute top-0 right-0 h-full w-1 cursor-col-resize transition-colors z-10 ${
              isResizing ? 'bg-[var(--ws-primary-500)]' : 'hover:bg-[var(--ws-primary-500)]/50'
            }`}
            onMouseDown={handleMouseDown}
          />
        </div>
        
        <div className="flex-1 flex flex-col min-w-0">
          <Outlet />
        </div>
      </div>
    </WorkspaceThemeProvider>
  );
}
