export type ThemeMode = 'light' | 'dark';

export interface ColorPalette {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  text: string;
  bg: string;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function hslToString(hsl: HSL): string {
  return `hsl(${hsl.h}, ${hsl.s}%, ${hsl.l}%)`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    }
    : null;
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export function generateColorPalette(
  hue: number,
  saturation: number,
  mode: ThemeMode
): ColorPalette {
  const isDark = mode === 'dark';

  const lightnessSteps = isDark
    ? [97, 90, 80, 70, 60, 50, 40, 30, 20, 12]
    : [98, 94, 86, 76, 64, 52, 44, 36, 28, 18];

  const saturationAdjust = isDark ? -15 : 0;
  const adjustedSat = Math.max(0, Math.min(100, saturation + saturationAdjust));

  const shades: ColorPalette = {
    50: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[0] }),
    100: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[1] }),
    200: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[2] }),
    300: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[3] }),
    400: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[4] }),
    500: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[5] }),
    600: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[6] }),
    700: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[7] }),
    800: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[8] }),
    900: hslToString({ h: hue, s: adjustedSat, l: lightnessSteps[9] }),
    text: isDark ? '#ffffff' : '#000000',
    bg: isDark ? '#1a1a2e' : '#ffffff',
  };

  return shades;
}

export function generateForegroundColor(
  backgroundColor: string,
  mode: ThemeMode
): string {
  const textOnLight = '#000000';
  const textOnDark = '#ffffff';
  const bgOnLight = '#ffffff';

  const contrastWithLight = getContrastRatio(backgroundColor, textOnLight);
  const contrastWithDark = getContrastRatio(backgroundColor, textOnDark);

  if (mode === 'dark') {
    return contrastWithLight > contrastWithDark ? textOnLight : textOnDark;
  } else {
    const contrastOnBgLight = getContrastRatio(bgOnLight, textOnLight);
    const contrastOnBgDark = getContrastRatio(bgOnLight, textOnDark);
    return contrastOnBgLight > contrastOnBgDark ? textOnLight : textOnDark;
  }
}

export const DEFAULT_PRIMARY_HUE = 187;
export const DEFAULT_PRIMARY_SATURATION = 75;
export const DEFAULT_SECONDARY_HUE = 262;
export const DEFAULT_SECONDARY_SATURATION = 68;

export function getDefaultPrimaryColor(mode: ThemeMode): ColorPalette {
  return generateColorPalette(DEFAULT_PRIMARY_HUE, DEFAULT_PRIMARY_SATURATION, mode);
}

export function getDefaultSecondaryColor(mode: ThemeMode): ColorPalette {
  return generateColorPalette(DEFAULT_SECONDARY_HUE, DEFAULT_SECONDARY_SATURATION, mode);
}

export function applyColorPaletteToCssVars(
  palette: ColorPalette,
  prefix: string
): Record<string, string> {
  return {
    [`--${prefix}-50`]: palette[50],
    [`--${prefix}-100`]: palette[100],
    [`--${prefix}-200`]: palette[200],
    [`--${prefix}-300`]: palette[300],
    [`--${prefix}-400`]: palette[400],
    [`--${prefix}-500`]: palette[500],
    [`--${prefix}-600`]: palette[600],
    [`--${prefix}-700`]: palette[700],
    [`--${prefix}-800`]: palette[800],
    [`--${prefix}-900`]: palette[900],
    [`--${prefix}-text`]: palette.text,
    [`--${prefix}-bg`]: palette.bg,
  };
}
