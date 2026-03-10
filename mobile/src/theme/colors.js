// FarmConnect Design System — updated based on new UI screens
// Primary: #2D6A4F, Secondary: #ECAE40, Background: #F5EFEB

export const colors = {
  primary:         '#2D6A4F', // Dark green used for headers, buttons, active icons
  primaryDark:     '#1B4332',
  primaryLight:    '#E7F0EB', // Light green background for tags e.g. 'QUICK TASK'
  primaryMedium:   'rgba(45, 106, 79, 0.2)',

  secondary:       '#ECAE40', // Yellow/orange used for 'Active Jobs' card and badges
  secondaryLight:  '#FDF4E6',

  backgroundLight: '#F5EFEB', // Warm beige/off-white background
  backgroundDark:  '#162210',

  white:           '#ffffff',
  black:           '#111814',

  textPrimary:     '#1C2A20', // Dark text for headings
  textSecondary:   '#6B7280', // Gray for subtext
  textMuted:       '#9CA3AF',

  gray50:          '#F3F4F6',
  gray100:         '#E5E7EB',
  gray400:         '#9CA3AF',
  gray500:         '#6B7280',

  // Custom Status
  statusWorking:   '#ECAE40', 
  statusBreak:     '#EF4444', 
  statusOnline:    '#2D6A4F', 

  error:           '#ef4444',
  success:         '#22c55e',
  warning:         '#eab308',
};

export const fonts = {
  regular:  'System',
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
    shadowColor: '#2D6A4F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
};
