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
  textMuted: '#858072',     // ≥4.5:1 sur carte ET fond (WCAG AA)

  // Bordures
  border: 'rgba(255,255,255,0.06)',
  borderStrong: 'rgba(232,184,75,0.20)', // liseré or subtil

  // Macros
  // Macros — teintes des maquettes OR & NOIR : l'or porte les protéines
  // (la macro que l'app met en avant), l'olive les glucides, la terre cuite
  // les lipides. Trois teintes distinctes en clair comme en sombre.
  proteinColor: '#E8B84B',
  carbsColor: '#8FA66B',
  fatColor: '#C77B4B',
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

// Zone de tap étendue pour les petits boutons icône (retour, fermer…) :
// invisible visuellement, porte la cible à ≥44pt (WCAG 2.5.5).
export const tapSlop = { top: 12, bottom: 12, left: 12, right: 12 };

// Ombre utilisée sur les cartes
export const shadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 6,
};

// ─────────────────────────────────────────────────────────────────────────────
// Tokens de la refonte « maquettes OR & NOIR » (Claude Design, 09/07/2026).
// Les maquettes composent avec des rayons plus généreux que R=14 et des
// dégradés nommés : les figer ici évite de re-saisir les mêmes hex écran par
// écran, ce qui est exactement ce qui avait fait diverger les 40 couleurs en
// dur relevées lors de la refonte de la vue globale.
// ─────────────────────────────────────────────────────────────────────────────

/** Rayons de la maquette. `hero` = grande carte, `card` = carte standard. */
export const Rr = {
  hero: 26,
  card: 20,
  panel: 18,
  field: 14,
  chip: 12,
  pill: 999,
};

/** Paires de dégradés (start → end), à passer tel quel à LinearGradient. */
export const Grad = {
  /** Grande carte sombre (anneau calories, résumé nutrition). */
  hero:    ['#1A1A1D', '#131315'] as const,
  /** Carte mise en avant, liseré or (séance du jour). */
  raised:  ['#1C1C1F', '#141416'] as const,
  /** Bouton d'action principal. Texte en Colors.onPrimary. */
  gold:    ['#E8B84B', '#C9990F'] as const,
  /** Pastille / avatar or, plus profond que le CTA. */
  goldDeep:['#E8B84B', '#B8860B'] as const,
  /** Icône or claire (badge coach, FAB). */
  goldSoft:['#F2CE73', '#D4A017'] as const,
  /** Bandeau coach teinté or sur fond sombre. */
  goldWash:['rgba(232,184,75,0.16)', 'rgba(232,184,75,0.04)'] as const,
};

/** Texte lisible sur un fond teinté or (bandeau coach). */
export const onGoldWash = '#B8A870';

/** Liseré or des cartes mises en avant. */
export const goldBorder = 'rgba(232,184,75,0.30)';
