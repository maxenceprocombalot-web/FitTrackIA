// Palette premium sombre — direction Streakly

export const Colors = {
  // Fonds
  bg: '#080a0e',
  surface: '#0f1117',
  surfaceElevated: '#141720',
  surfaceHighlight: '#1a1f2e',

  // Marques
  primary: '#7c6dfa',    // violet
  green: '#22c97a',
  red: '#e8445a',
  orange: '#f07830',
  yellow: '#f5c542',
  blue: '#4a9eff',

  // Texte
  text: '#f0f2fa',
  textSecondary: '#8891aa',
  textMuted: '#565d7a',

  // Bordures
  border: 'rgba(255,255,255,0.05)',
  borderStrong: 'rgba(255,255,255,0.10)',

  // Macros
  proteinColor: '#4a9eff',
  carbsColor: '#f07830',
  fatColor: '#f5c542',
  caloriesColor: '#22c97a',
};

export const R = 14; // border radius par défaut

export const Sp = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Fs = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 26,
  xxxl: 34,
};

export const Fw = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  heavy: '800' as const,
};

// Ombre utilisée sur les cartes
export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 6,
};
