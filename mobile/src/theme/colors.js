// FarmConnect Design System — extracted from HTML mocks
// Primary: #5bec13, Background Light: #f6f8f6, Background Dark: #162210

export const colors = {
  primary:         '#5bec13',
  primaryDark:     '#49be0f',
  primaryLight:    'rgba(91, 236, 19, 0.1)',
  primaryMedium:   'rgba(91, 236, 19, 0.2)',

  backgroundLight: '#f6f8f6',
  backgroundDark:  '#162210',

  white:           '#ffffff',
  black:           '#131811',

  textPrimary:     '#131811',
  textSecondary:   '#6f8961',
  textMuted:       '#9ca88f',

  gray50:          '#f2f4f0',
  gray100:         '#e5e7eb',
  gray400:         '#9ca3af',
  gray500:         '#6b7280',

  statusWorking:   '#FF4D4D',
  statusBreak:     '#FFD700',
  statusOnline:    '#5bec13',

  error:           '#ef4444',
  success:         '#22c55e',
  warning:         '#eab308',
};

export const fonts = {
  regular:  'System',  // Will use Lexend when loaded
  medium:   'System',
  bold:     'System',
  black:    'System',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  full: 9999,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: '#5bec13',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
};
