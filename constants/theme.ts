// Palette OR & NOIR — direction sportive (Strava / Nike), design FitTrack IA

export const Colors = {
  // Fonds
  bg: '#0A0A0B',            // noir profond
  surface: '#161618',       // cartes
  surfaceElevated: '#1E1E22',
  surfaceHighlight: '#26231A', // surbrillance teintée or

  // Marque (or)
  primary: '#E8B84B',       // or principal (accent, CTA)
  primaryDeep: '#D4A017',   // or profond (dégradés, pressé)
  onPrimary: '#0A0A0B',     // texte/icônes SUR l'or → foncé (contraste)

  // Couleurs fonctionnelles (statuts, graphes)
  green: '#3FB96B',
  red: '#E8546B',
  orange: '#E8894B',
  yellow: '#F0CC5A',
  blue: '#5B9BE8',

  // Texte
  text: '#F5F2EA',          // crème
  textSecondary: '#8A8578', // gris-or atténué
  textMuted: '#5C584F',

  // Bordures
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(232,184,75,0.20)', // liseré or subtil

  // Macros
  proteinColor: '#5B9BE8',
  carbsColor: '#E8894B',
  fatColor: '#F0CC5A',
  caloriesColor: '#E8B84B',
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

// Familles Barlow (chargées dans app/_layout.tsx). Sur Android, la graisse fait
// partie de la famille : utiliser CES tokens (fontFamily) plutôt que fontWeight
// quand on veut du Barlow. `condensed*` = gros chiffres sportifs.
export const Fonts = {
  regular:        'Barlow_400Regular',
  medium:         'Barlow_500Medium',
  semibold:       'Barlow_600SemiBold',
  bold:           'Barlow_700Bold',
  heavy:          'Barlow_800ExtraBold',
  condensed:      'BarlowCondensed_600SemiBold',
  condensedBold:  'BarlowCondensed_700Bold',
  condensedHeavy: 'BarlowCondensed_800ExtraBold',
};

// Ombre utilisée sur les cartes
export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 6,
};
