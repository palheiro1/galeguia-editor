// Design System for Galeguia Editor
import { Platform, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export const COLORS = {
  // Primary colors
  primary: '#6366f1',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  
  // Secondary colors
  secondary: '#06b6d4',
  secondaryLight: '#67e8f9',
  secondaryDark: '#0891b2',
  
  // Success, Warning, Error
  success: '#10b981',
  successLight: '#6ee7b7',
  successDark: '#047857',
  
  warning: '#f59e0b',
  warningLight: '#fbbf24',
  warningDark: '#d97706',
  
  error: '#ef4444',
  errorLight: '#f87171',
  errorDark: '#dc2626',
  
  // Neutral colors
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
  black: '#000000',
  
  // Blue color variants for special UI elements
  blue50: '#eff6ff',
  blue100: '#dbeafe',
  blue200: '#bfdbfe',
  blue300: '#93c5fd',
  blue500: '#3b82f6',
  blue600: '#2563eb',
  
  // Semantic colors
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  textTertiary: '#94a3b8',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  // Text color variants
  text: {
    primary: '#1e293b',
    secondary: '#64748b',
    tertiary: '#94a3b8',
    inverse: '#ffffff',
    disabled: '#94a3b8',
  },
  
  // Status colors
  online: '#10b981',
  offline: '#6b7280',
  busy: '#ef4444',
  away: '#f59e0b',
};

export const TYPOGRAPHY = {
  // Font families
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    web: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }),
  
  // Font sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  
  // Font weights
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
  },
  
  // Line heights
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  
  // Semantic typography styles
  h1: {
    fontSize: 30,
    fontWeight: '700' as const,
    lineHeight: 1.25,
  },
  h2: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 1.375,
  },
  h3: {
    fontSize: 20,
    fontWeight: '600' as const,
    lineHeight: 1.375,
  },
  h4: {
    fontSize: 18,
    fontWeight: '500' as const,
    lineHeight: 1.5,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    lineHeight: 1.5,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    lineHeight: 1.5,
  },
  caption: {
    fontSize: 12,
    fontWeight: '400' as const,
    lineHeight: 1.375,
  },
  label: {
    fontSize: 14,
    fontWeight: '500' as const,
    lineHeight: 1.375,
  },
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 48,
  '4xl': 64,
  '5xl': 80,
  '6xl': 96,
};

export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  base: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export const SHADOWS = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
    web: {
      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    },
  }),
  base: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    android: {
      elevation: 4,
    },
    web: {
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
    },
    android: {
      elevation: 8,
    },
    web: {
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.15,
      shadowRadius: 16,
    },
    android: {
      elevation: 16,
    },
    web: {
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
  }),
};

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
};

export const LAYOUT = {
  containerMaxWidth: 1200,
  headerHeight: Platform.select({
    ios: 88,
    android: 72,
    web: 64,
  }),
  tabBarHeight: Platform.select({
    ios: 83,
    android: 56,
    web: 60,
  }),
  isSmallScreen: screenWidth < BREAKPOINTS.md,
  isMediumScreen: screenWidth >= BREAKPOINTS.md && screenWidth < BREAKPOINTS.lg,
  isLargeScreen: screenWidth >= BREAKPOINTS.lg,
};

export const ANIMATIONS = {
  duration: {
    fast: 150,
    normal: 200,
    slow: 300,
  },
  easing: {
    easeInOut: 'ease-in-out',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    linear: 'linear',
  },
};

// Common component styles
export const COMMON_STYLES = {
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.base,
  },
  
  button: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.base,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    flexDirection: 'row' as const,
    gap: SPACING.sm,
  },
  
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.base,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.base,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.textPrimary,
  },
  
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.base,
    ...SHADOWS.sm,
  },
};

// Icon sizes
export const ICON_SIZES = {
  xs: 16,
  sm: 20,
  base: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};

// Component variants
export const BUTTON_VARIANTS = {
  primary: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  secondary: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  success: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  warning: {
    backgroundColor: COLORS.warning,
    borderColor: COLORS.warning,
  },
  error: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
};

export const STATUS_COLORS = {
  published: {
    background: '#dcfce7',
    text: COLORS.success,
    border: '#bbf7d0',
  },
  draft: {
    background: '#fef3c7',
    text: COLORS.warning,
    border: '#fde68a',
  },
  archived: {
    background: '#f3f4f6',
    text: COLORS.gray600,
    border: '#e5e7eb',
  },
};
