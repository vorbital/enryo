import { create } from 'zustand';
import type { Workspace, Channel } from '../lib/api';

interface AppState {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  currentChannel: Channel | null;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  workspaces: [],
  currentWorkspace: null,
  currentChannel: null,
  setWorkspaces: (workspaces) => set({ workspaces }),
  setCurrentWorkspace: (currentWorkspace) => set({ currentWorkspace }),
  setCurrentChannel: (currentChannel) => set({ currentChannel }),
}));
