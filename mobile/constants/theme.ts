/**
 * ZyGene Agricultural Mobile Design Tokens & Theme
 * Professional, calm, neutral AgriTech palette and spacing system.
 */

import { Platform } from 'react-native';

export const COLORS = {
  // Brand Green (strategic usage only, not overused)
  primary: "#1B5E20",
  primaryDark: "#144517",
  primaryLight: "#E8F5E9",
  accent: "#2E7D32",

  // Backgrounds & Surfaces
  background: "#F8FAF8",
  surface: "#FFFFFF",
  surfaceSubtle: "#F4F6F4",
  surfaceMuted: "#EAEFEA",

  // Typography
  text: "#1C2526",
  textSecondary: "#5A6B63",
  textMuted: "#8C9B93",
  textLight: "#FFFFFF",

  // Borders & Dividers
  border: "#E2E8E2",
  borderLight: "#EEF2EE",
  borderDark: "#CBD5CB",

  // Functional Status Badges & Alerts (Subtle & Restrained)
  active: "#2E7D32",
  activeBg: "#E8F5E9",
  harvested: "#0D47A1",
  harvestedBg: "#E3F2FD",
  planned: "#7B1FA2",
  plannedBg: "#F3E5F5",
  warning: "#B45309",
  warningBg: "#FEF3C7",
  danger: "#C62828",
  dangerBg: "#FFEBEE",
  neutral: "#546E7A",
  neutralBg: "#ECEFF1",
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
};

export const RADIUS = {
  xs: 4,
  sm: 6,
  md: 8,
  base: 10,
  lg: 12,
  xl: 16,
  pill: 999,
};

export const TYPOGRAPHY = {
  screenTitle: {
    fontSize: 24,
    fontWeight: "700" as const,
    color: COLORS.text,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: COLORS.text,
    letterSpacing: -0.2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: COLORS.text,
  },
  body: {
    fontSize: 14,
    fontWeight: "400" as const,
    color: COLORS.text,
    lineHeight: 20,
  },
  bodyMedium: {
    fontSize: 14,
    fontWeight: "500" as const,
    color: COLORS.text,
    lineHeight: 20,
  },
  supporting: {
    fontSize: 12,
    fontWeight: "400" as const,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  caption: {
    fontSize: 11,
    fontWeight: "600" as const,
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const,
  },
  metric: {
    fontSize: 28,
    fontWeight: "700" as const,
    color: COLORS.text,
    letterSpacing: -0.5,
  },
};

export const SHADOWS = {
  subtle: {
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  card: {
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  floating: {
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
};

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

export default {
  COLORS,
  SPACING,
  RADIUS,
  TYPOGRAPHY,
  SHADOWS,
  Colors,
  Fonts,
};
