// FarmConnect Design System — extracted from HTML mocks
// Primary: #5bec13, Background Light: #f6f8f6, Background Dark: #162210

export const colors = {
  primary:         '#2D6A4F', // Dark green used for headers, buttons, active icons
  primaryDark:     '#1B4332',
  primaryLight:    '#E7F0EB', // Light green background for tags e.g. 'QUICK TASK'
  primaryMedium:   'rgba(45, 106, 79, 0.2)',
  primaryGradient: ['#40916c', '#2D6A4F'], // Lighter to darker green

  secondary:       '#ECAE40', // Yellow/orange used for 'Active Jobs' card and badges
  secondaryLight:  '#FDF4E6',
  secondaryGradient: ['#f4a261', '#e76f51'], // Modern warm gradient

  backgroundLight: '#EAE5E0', // Slightly darker warm beige for better glass contrast
  backgroundDark:  '#162210',

  // Glassmorphism specific
  glassBgDark:     'rgba(255, 255, 255, 0.1)',
  glassBgLight:    'rgba(255, 255, 255, 0.65)', // Semi-transparent white
  glassBorder:     'rgba(255, 255, 255, 0.4)',  // Subtle border highlight

  white:           '#ffffff',
  black:           '#131811',

  textPrimary:     '#1C2A20', // Dark text for headings
  textSecondary:   '#4B5563', // Slightly darker subtext for readability on glass
  textMuted:       '#9CA3AF',

  gray50:          '#F3F4F6',
  gray100:         '#E5E7EB',
  gray200:         '#D1D5DB',
  gray400:         '#9CA3AF',
  gray500:         '#6B7280',

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
