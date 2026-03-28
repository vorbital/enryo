import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { useThemeStore } from '../stores/theme';
import { api } from '../lib/api';
import {
  generateColorPalette,
  applyColorPaletteToCssVars,
  getDefaultPrimaryColor,
  getDefaultSecondaryColor,
} from '../lib/colors';
import type { WorkspaceSettings } from '../lib/api';

function setCssVariables(vars: Record<string, string>) {
  const root = document.documentElement;
  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export default function WorkspaceThemeProvider({ children }: { children: React.ReactNode }) {
  const { workspaceSlug } = useParams<{ workspaceSlug?: string }>();
  const { token } = useAuthStore();
  const { currentWorkspace } = useAppStore();
  const { mode: themeMode } = useThemeStore();

  useEffect(() => {
    if (!workspaceSlug || !token) return;

    const workspace = currentWorkspace?.slug === workspaceSlug
      ? currentWorkspace
      : useAppStore.getState().workspaces.find(w => w.slug === workspaceSlug);

    if (!workspace) {
      api.workspaces.get(token, workspaceSlug)
        .catch(console.error);
      return;
    }

    api.workspaces.getSettings(token, workspace.slug)
      .then((settings: WorkspaceSettings) => {
        const primaryHue = settings.primary_hue ?? 187;
        const primarySat = settings.primary_saturation ?? 75;
        const secondaryHue = settings.secondary_hue ?? 262;
        const secondarySat = settings.secondary_saturation ?? 68;

        const primaryPalette = generateColorPalette(primaryHue, primarySat, themeMode);
        const secondaryPalette = generateColorPalette(secondaryHue, secondarySat, themeMode);

        const primaryVars = applyColorPaletteToCssVars(primaryPalette, 'ws-primary');
        const secondaryVars = applyColorPaletteToCssVars(secondaryPalette, 'ws-secondary');

        setCssVariables({
          '--ws-primary-hue': String(primaryHue),
          '--ws-primary-saturation': String(primarySat),
          '--ws-secondary-hue': String(secondaryHue),
          '--ws-secondary-saturation': String(secondarySat),
          ...primaryVars,
          ...secondaryVars,
        });
      })
      .catch((err) => {
        console.error('Failed to load workspace settings:', err);
        const primaryPalette = getDefaultPrimaryColor(themeMode);
        const secondaryPalette = getDefaultSecondaryColor(themeMode);
        const primaryVars = applyColorPaletteToCssVars(primaryPalette, 'ws-primary');
        const secondaryVars = applyColorPaletteToCssVars(secondaryPalette, 'ws-secondary');
        setCssVariables({ ...primaryVars, ...secondaryVars });
      });
  }, [workspaceSlug, token, currentWorkspace, themeMode]);

  return <>{children}</>;
}
