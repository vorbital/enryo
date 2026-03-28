import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth';
import { useThemeStore } from '../stores/theme';
import { api } from '../lib/api';
import { generateColorPalette } from '../lib/colors';

export default function WorkspaceSettingsPage() {
  const { workspaceSlug } = useParams<{ workspaceSlug: string }>();
  const { token } = useAuthStore();
  const { mode } = useThemeStore();

  const [primaryHue, setPrimaryHue] = useState(187);
  const [primarySaturation, setPrimarySaturation] = useState(75);
  const [secondaryHue, setSecondaryHue] = useState(262);
  const [secondarySaturation, setSecondarySaturation] = useState(68);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!workspaceSlug || !token) return;

    api.workspaces.getSettings(token, workspaceSlug)
      .then((settings) => {
        if (settings.primary_hue !== undefined) setPrimaryHue(settings.primary_hue);
        if (settings.primary_saturation !== undefined) setPrimarySaturation(settings.primary_saturation);
        if (settings.secondary_hue !== undefined) setSecondaryHue(settings.secondary_hue);
        if (settings.secondary_saturation !== undefined) setSecondarySaturation(settings.secondary_saturation);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [workspaceSlug, token]);

  const handleSave = async () => {
    if (!workspaceSlug || !token) return;
    setIsSaving(true);
    try {
      await api.workspaces.updateSettings(token, workspaceSlug, {
        primary_hue: primaryHue,
        primary_saturation: primarySaturation,
        secondary_hue: secondaryHue,
        secondary_saturation: secondarySaturation,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const primaryPreview = generateColorPalette(primaryHue, primarySaturation, mode);
  const secondaryPreview = generateColorPalette(secondaryHue, secondarySaturation, mode);
  const lightPrimaryPreview = generateColorPalette(primaryHue, primarySaturation, 'light');
  const lightSecondaryPreview = generateColorPalette(secondaryHue, secondarySaturation, 'light');

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-[var(--text-muted)]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--bg-primary)] p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-6">
          Workspace Settings
        </h1>

        <div className="space-y-8">
          <section className="bg-[var(--bg-secondary)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Brand Colors
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6">
              Choose hues and saturation levels for your workspace. Lightness will be adjusted automatically for readability.
            </p>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-[var(--border-color)]"
                    style={{ backgroundColor: primaryPreview[500] }}
                  />
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Hue: {primaryHue}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={primaryHue}
                      onChange={(e) => setPrimaryHue(Number(e.target.value))}
                      className="w-full h-2 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg border-2 border-[var(--border-color)]" />
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Saturation: {primarySaturation}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={primarySaturation}
                      onChange={(e) => setPrimarySaturation(Number(e.target.value))}
                      className="w-full h-2 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-4 mb-2">
                  <div
                    className="w-12 h-12 rounded-lg border-2 border-[var(--border-color)]"
                    style={{ backgroundColor: secondaryPreview[500] }}
                  />
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Hue: {secondaryHue}°</label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={secondaryHue}
                      onChange={(e) => setSecondaryHue(Number(e.target.value))}
                      className="w-full h-2 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg border-2 border-[var(--border-color)]" />
                  <div className="flex-1">
                    <label className="block text-xs text-[var(--text-muted)] mb-1">Saturation: {secondarySaturation}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={secondarySaturation}
                      onChange={(e) => setSecondarySaturation(Number(e.target.value))}
                      className="w-full h-2 bg-[var(--bg-primary)] rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[var(--bg-secondary)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Preview (Dark Mode)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-2">Primary</p>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div
                      key={shade}
                      className="h-6 rounded flex items-center px-2 text-xs"
                      style={{
                        backgroundColor: primaryPreview[shade as keyof typeof primaryPreview],
                        color: shade >= 500 ? '#fff' : '#000',
                      }}
                    >
                      {shade}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-2">Secondary</p>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div
                      key={shade}
                      className="h-6 rounded flex items-center px-2 text-xs"
                      style={{
                        backgroundColor: secondaryPreview[shade as keyof typeof secondaryPreview],
                        color: shade >= 500 ? '#fff' : '#000',
                      }}
                    >
                      {shade}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-[var(--bg-secondary)] rounded-lg p-6">
            <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
              Preview (Light Mode)
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-2">Primary</p>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div
                      key={shade}
                      className="h-6 rounded flex items-center px-2 text-xs"
                      style={{
                        backgroundColor: lightPrimaryPreview[shade as keyof typeof lightPrimaryPreview],
                        color: shade >= 500 ? '#fff' : '#000',
                      }}
                    >
                      {shade}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)] mb-2">Secondary</p>
                <div className="space-y-2">
                  {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                    <div
                      key={shade}
                      className="h-6 rounded flex items-center px-2 text-xs"
                      style={{
                        backgroundColor: lightSecondaryPreview[shade as keyof typeof lightSecondaryPreview],
                        color: shade >= 500 ? '#fff' : '#000',
                      }}
                    >
                      {shade}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                saved
                  ? 'bg-green-500 text-white'
                  : 'bg-[var(--ws-primary-500)] text-[var(--ws-primary-bg)] hover:opacity-90'
              }`}
            >
              {isSaving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}