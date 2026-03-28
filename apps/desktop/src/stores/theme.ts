import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '../lib/colors';

const getInitialTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'dark';
  const stored = localStorage.getItem('theme-storage');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.state?.mode || 'dark';
    } catch {
      return 'dark';
    }
  }
  return 'dark';
};

if (typeof window !== 'undefined') {
  document.documentElement.setAttribute('data-theme', getInitialTheme());
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      setMode: (mode) => {
        set({ mode });
        document.documentElement.setAttribute('data-theme', mode);
      },
      toggleMode: () => {
        const newMode = get().mode === 'dark' ? 'light' : 'dark';
        set({ mode: newMode });
        document.documentElement.setAttribute('data-theme', newMode);
      },
    }),
    {
      name: 'theme-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          document.documentElement.setAttribute('data-theme', state.mode);
        }
      },
    }
  )
);