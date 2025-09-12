// BlueBot Design System
// Centralized theme tokens for consistent, modern UI (Dark + Glassmorphism)

import { Platform } from 'react-native';

// Token sets: Dark (default) and Light
const colorsDark = {
  // Deep dark surfaces (navy / blue)
  background: '#0A1220',
  surface: '#0C1733',
  card: '#0F1E3D',
  cardAlt: '#0B1733',
  border: '#1E345A',

  // Text
  text: '#F1F5F9',
  muted: '#9AA4B2',

  // Brand (blue-forward)
  primary: '#3B82F6', // Blue 500
  primaryDark: '#1D4ED8', // Blue 700
  accent: '#60A5FA', // Light blue

  // Status
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',

  // Decoratives
  chipBg: '#11244A',
  glass: 'rgba(15, 30, 61, 0.6)',
};

const gradientsDark = {
  // Background sweep
  primary: ['#081024', '#0B1A3A'],
  // Hero/pill cards (blue)
  hero: ['#0EA5E9', '#2563EB'],
  // Blue glow
  glow: ['#2563EB', '#38BDF8'],
  success: ['#10B981', '#059669'],
  info: ['#0EA5E9', '#0284C7'],
  // Keep key name but switch to blue palette to avoid refactor
  purple: ['#60A5FA', '#3B82F6'],
  warning: ['#F59E0B', '#D97706'],
  // Bottom nav / sheets
  nav: ['#0B1A3A', '#081024'],
};

const colorsLight = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardAlt: '#F1F5F9',
  border: '#E2E8F0',

  text: '#0F172A',
  muted: '#64748B',

  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  accent: '#0EA5E9',

  success: '#10B981',
  warning: '#D97706',
  danger: '#DC2626',

  chipBg: '#E2E8F0',
  glass: 'rgba(255,255,255,0.6)',
};

const gradientsLight = {
  primary: ['#EFF6FF', '#DBEAFE'],
  hero: ['#93C5FD', '#60A5FA'],
  glow: ['#60A5FA', '#93C5FD'],
  success: ['#A7F3D0', '#34D399'],
  info: ['#BAE6FD', '#60A5FA'],
  purple: ['#BFDBFE', '#93C5FD'], // kept key name for compatibility
  warning: ['#FDE68A', '#F59E0B'],
  nav: ['#FFFFFF', '#F8FAFC'],
};

// Optional Standard Bank brand palette (can be applied via setBrandPalette)
export const STANDARD_BANK_BRAND = {
  primary: '#0033A1',     // SB Blue
  primaryDark: '#001E60', // Deep SB Blue
  accent: '#00A9E0',      // Cyan accent
} as const;

// Typography tokens
const typography = {
  fontFamily: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  sizes: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 22,
    display: 28,
  },
  weight: {
    regular: Platform.OS === 'ios' ? '400' : '400',
    medium: Platform.OS === 'ios' ? '600' : '500',
    bold: Platform.OS === 'ios' ? '700' : '700',
  },
  lineHeights: {
    sm: 18,
    md: 22,
    lg: 26,
    xl: 32,
    display: 36,
  },
} as const;

// Component sizing (compact header/tabs)
const sizes = {
  headerHeight: 52,
  headerHeightCompact: 44,
  tabHeight: 36,
  tabHeightCompact: 30,
  icon: 20,
  borderWidth: 1,
} as const;

// z-index scale
const zIndex = {
  base: 0,
  header: 10,
  tab: 9,
  overlay: 20,
  modal: 30,
  toast: 40,
} as const;

type Colors = typeof colorsDark;

// Exported theme object (mutable via setThemeMode)
export const theme = {
  colors: { ...colorsDark },
  gradients: { ...gradientsDark },
  radius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    pill: 999,
  },
  spacing: {
    xxs: 4,
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 32,
  },
  typography,
  sizes,
  zIndex,
  isDark: true,
};

export type Theme = typeof theme;

export const setThemeMode = (mode: 'dark' | 'light') => {
  const src = mode === 'light' ? { colors: colorsLight, gradients: gradientsLight } : { colors: colorsDark, gradients: gradientsDark };
  Object.assign(theme.colors, src.colors);
  Object.assign(theme.gradients, src.gradients);
  theme.isDark = mode !== 'light';
};

// Apply a brand palette override (e.g., STANDARD_BANK_BRAND)
export type BrandPalette = Partial<
  Pick<Colors, 'primary' | 'primaryDark' | 'accent' | 'success' | 'warning' | 'danger' | 'chipBg' | 'border'>
>;
export const setBrandPalette = (palette: BrandPalette) => {
  Object.assign(theme.colors, palette);
};

// Utility: convert hex to rgba
const hexToRgb = (hex: string) => {
  const m = hex.replace('#', '');
  const str = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const bigint = parseInt(str, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b };
};

export const rgba = (hex: string, alpha = 1) => {
  try {
    const { r, g, b } = hexToRgb(hex);
    const a = Math.min(Math.max(alpha, 0), 1);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  } catch {
    return hex;
  }
};

export const shadow = (elevation = 10, opacity = 0.18) => ({
  shadowColor: '#000',
  shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
  shadowOpacity: Platform.OS === 'android' ? 0.25 : opacity,
  shadowRadius: elevation,
  elevation,
});
