// Primitives de la refonte « maquettes OR & NOIR » (Claude Design, 09/07/2026).
//
// Pourquoi un fichier de primitives plutôt que des styles par écran : les
// maquettes répètent exactement cinq objets (grande carte sombre, carte à
// liseré or, CTA doré, bandeau coach, tuile de chiffre). Les écrire une fois
// évite la dérive relevée sur max-os — 45 StyleSheet séparés et 40 hex en dur
// pour un même vocabulaire visuel.

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  StyleProp, ViewStyle, TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors, Sp, Fs, Fonts, Rr, Grad, onGoldWash, goldBorder, tapSlop,
} from '../../constants/theme';

// ─── Grande carte sombre ─────────────────────────────────────────────────────
// Maquette : linear-gradient(160deg,#1A1A1D,#131315), radius 26, padding 22.

export function HeroCard({ children, style }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={[...Grad.hero]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={[s.hero, style]}
    >
      {children}
    </LinearGradient>
  );
}

// ─── Carte mise en avant, liseré or ──────────────────────────────────────────
// Maquette : la séance du jour et l'exercice en cours.

export function RaisedCard({ children, style }: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={[...Grad.raised]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[s.raised, style]}
    >
      {children}
    </LinearGradient>
  );
}

// ─── CTA doré ────────────────────────────────────────────────────────────────
// Le texte est TOUJOURS Colors.onPrimary : de l'or clair sous du texte clair
// tombe sous le seuil AA, et c'est le bouton le plus cliqué de l'app.

export function GoldButton({ title, onPress, icon, style, disabled, compact }: {
  title: string;
  onPress: () => void;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={[disabled && s.disabled, style]}
    >
      <LinearGradient
        colors={[...Grad.gold]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.goldBtn, compact && s.goldBtnCompact]}
      >
        {!!icon && <Ionicons name={icon} size={17} color={Colors.onPrimary} />}
        <Text style={s.goldBtnText}>{title}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Pastille dorée (icône) ──────────────────────────────────────────────────

export function GoldTile({ children, size = 44, radius, deep, style }: {
  children: React.ReactNode;
  size?: number;
  radius?: number;
  /** Variante plus profonde, utilisée pour les avatars. */
  deep?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <LinearGradient
      colors={deep ? [...Grad.goldDeep] : [...Grad.goldSoft]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        { width: size, height: size, borderRadius: radius ?? size * 0.31 },
        s.center,
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

// ─── Bandeau coach teinté or ─────────────────────────────────────────────────

export function CoachBanner({ title, subtitle, onPress, glyph = '✦', chevron }: {
  title: string;
  subtitle: string;
  onPress?: () => void;
  glyph?: string;
  chevron?: boolean;
}) {
  const body = (
    <LinearGradient
      colors={[...Grad.goldWash]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0.6 }}
      style={s.banner}
    >
      <GoldTile size={44} radius={14}>
        <Text style={s.bannerGlyph}>{glyph}</Text>
      </GoldTile>
      <View style={{ flex: 1 }}>
        <Text style={s.bannerTitle}>{title}</Text>
        <Text style={s.bannerSub} numberOfLines={2}>{subtitle}</Text>
      </View>
      {chevron && <Ionicons name="chevron-forward" size={18} color={Colors.primary} />}
    </LinearGradient>
  );

  if (!onPress) return body;
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.85} accessibilityRole="button">
      {body}
    </TouchableOpacity>
  );
}

// ─── Tuile de chiffre ────────────────────────────────────────────────────────
// Maquette 1a : « Poids actuel 74,2 kg / ▼ 0,8 kg cette sem. »

export function StatTile({ label, value, unit, footnote, footnoteColor, onPress }: {
  label: string;
  value: string;
  unit?: string;
  footnote?: string;
  footnoteColor?: string;
  onPress?: () => void;
}) {
  const Wrapper: React.ComponentType<any> = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={s.tile}
      onPress={onPress}
      activeOpacity={0.85}
      {...(onPress ? { accessibilityRole: 'button' as const } : {})}
    >
      <Text style={s.tileLabel}>{label}</Text>
      <Text style={s.tileValue}>
        {value}
        {!!unit && <Text style={s.tileUnit}> {unit}</Text>}
      </Text>
      {!!footnote && (
        <Text style={[s.tileFoot, !!footnoteColor && { color: footnoteColor }]} numberOfLines={1}>
          {footnote}
        </Text>
      )}
    </Wrapper>
  );
}

// ─── Titre d'écran condensé ──────────────────────────────────────────────────

export function DisplayTitle({ children, style }: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[s.display, style]}>{children}</Text>;
}

// ─── Intertitre en capitales ─────────────────────────────────────────────────

export function SectionLabel({ children, style }: {
  children: React.ReactNode;
  style?: StyleProp<TextStyle>;
}) {
  return <Text style={[s.section, style]}>{children}</Text>;
}

// ─── Bouton flottant doré ────────────────────────────────────────────────────

export function Fab({ onPress, label, icon = 'add' }: {
  onPress: () => void;
  /** Libellé lu par VoiceOver — le « + » seul ne dit rien. */
  label: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
}) {
  return (
    <TouchableOpacity
      style={s.fab}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={tapSlop}
    >
      <LinearGradient
        colors={[...Grad.goldSoft]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.fabInner, s.center]}
      >
        <Ionicons name={icon} size={28} color={Colors.onPrimary} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Puce sélectionnable ─────────────────────────────────────────────────────

export function Chip({ label, active, onPress, style }: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const content = <Text style={[s.chipText, active && s.chipTextActive]}>{label}</Text>;

  if (active) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityState={{ selected: true }}
        style={style}
      >
        <LinearGradient
          colors={[...Grad.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.chip}
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityState={{ selected: false }}
      style={[s.chip, s.chipIdle, style]}
    >
      {content}
    </TouchableOpacity>
  );
}

// ─── Barre de macro fine ─────────────────────────────────────────────────────
// Maquette 1a : libellé à gauche, « 92/140g » à droite, piste de 6px.

export function MacroLine({ label, current, goal, color, unit = 'g' }: {
  label: string;
  current: number;
  goal: number;
  color: string;
  unit?: string;
}) {
  const pct = goal > 0 ? Math.min(current / goal, 1) : 0;
  return (
    <View
      accessible
      accessibilityLabel={`${label} : ${Math.round(current)} sur ${Math.round(goal)} ${unit}`}
    >
      <View style={s.macroHead}>
        <Text style={s.macroLabel}>{label}</Text>
        <Text style={s.macroValue}>
          {Math.round(current)}
          <Text style={s.macroGoal}>/{Math.round(goal)}{unit}</Text>
        </Text>
      </View>
      <View style={s.macroTrack}>
        <View style={[s.macroFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },

  hero: {
    borderRadius: Rr.hero,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 22,
  },
  raised: {
    borderRadius: Rr.card,
    borderWidth: 1,
    borderColor: goldBorder,
    padding: Sp.md,
  },

  goldBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: Sp.md,
  },
  goldBtnCompact: { paddingVertical: 12, borderRadius: Rr.field },
  goldBtnText: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.onPrimary },
  disabled: { opacity: 0.45 },

  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: Rr.card,
    borderWidth: 1,
    borderColor: goldBorder,
    padding: Sp.md,
  },
  bannerGlyph: { fontSize: 20, color: Colors.onPrimary, fontFamily: Fonts.bold },
  bannerTitle: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text },
  bannerSub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: onGoldWash, marginTop: 1 },

  tile: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Rr.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Sp.md,
  },
  tileLabel: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, marginBottom: 8 },
  tileValue: { fontSize: 30, fontFamily: Fonts.condensedBold, color: Colors.text },
  tileUnit: { fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.textSecondary },
  tileFoot: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },

  display: {
    fontSize: 32,
    fontFamily: Fonts.condensedBold,
    color: Colors.text,
    textTransform: 'uppercase',
  },
  section: {
    fontSize: Fs.sm,
    fontFamily: Fonts.semibold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  fab: { position: 'absolute', right: Sp.md, bottom: 24 },
  fabInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    shadowColor: Grad.goldSoft[1],
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 16,
    elevation: 8,
  },

  chip: { borderRadius: Rr.pill, paddingHorizontal: 14, paddingVertical: 8 },
  chipIdle: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  chipText: { fontSize: Fs.sm, fontFamily: Fonts.medium, color: '#B8B3A8' },
  chipTextActive: { fontFamily: Fonts.bold, color: Colors.onPrimary },

  macroHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  macroLabel: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  macroValue: { fontSize: Fs.sm, fontFamily: Fonts.medium, color: Colors.text },
  macroGoal: { color: Colors.textMuted },
  macroTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
  macroFill: { height: '100%', borderRadius: 3 },
});
