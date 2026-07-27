import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PERSONAL_PHASES, PERSONAL_RULES, PERSONAL_HOME_ROUTINE, PERSONAL_HOME_SHORT, PERSONAL_RIM_WORK, PERSONAL_RIM_RULES, PERSONAL_MINIMUM, PERSONAL_PACES, AthleticItem } from '../../constants/personal-program';
import { Colors, R, Sp, Fs, Fonts, tapSlop } from '../../constants/theme';

// Écran PERSONNEL (bloc athlétique basket).
// Accessible uniquement en développement — voir la garde __DEV__ dans l'onglet
// Sport : il n'apparaît dans aucun build de production destiné à l'App Store.

const TAG_META: Record<NonNullable<AthleticItem['tag']>, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  plyo:       { color: Colors.primary, icon: 'flash' },
  endurance:  { color: Colors.blue,    icon: 'pulse' },
  skills:     { color: Colors.orange,  icon: 'basketball' },
  prevention: { color: Colors.green,   icon: 'shield-checkmark' },
  interdit:   { color: Colors.red,     icon: 'ban' },
};

export default function PersoAthletiqueScreen() {
  const router = useRouter();
  const [phaseIdx, setPhaseIdx] = useState(0);

  if (PERSONAL_PHASES.length === 0) {
    return (
      <View style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: Sp.lg }]}>
        <Ionicons name="lock-closed-outline" size={44} color={Colors.textMuted} />
        <Text style={styles.emptyText}>
          Aucun programme personnel chargé.{'\n'}
          Copie `personal-program.example.ts` en `personal-program.ts`.
        </Text>
      </View>
    );
  }

  const phase = PERSONAL_PHASES[phaseIdx];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={tapSlop}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏀 Mon bloc athlétique</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Sélecteur de phase */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.phaseRow}>
          {PERSONAL_PHASES.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[styles.phaseChip, i === phaseIdx && styles.phaseChipActive]}
              onPress={() => { Haptics.selectionAsync(); setPhaseIdx(i); }}
              accessibilityRole="button"
            >
              <Text style={[styles.phaseChipText, i === phaseIdx && styles.phaseChipTextActive]}>{p.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Contexte de la phase */}
        <View style={styles.goalCard}>
          <Text style={styles.blockLabel}>{phase.block}</Text>
          <Text style={styles.goalText}>{phase.goal}</Text>
        </View>

        {/* Semaine */}
        {phase.week.map(d => (
          <View key={d.day} style={styles.dayCard}>
            <View style={styles.dayHeader}>
              <Text style={styles.dayName}>{d.day}</Text>
              <Text style={styles.dayMuscu}>{d.muscu}</Text>
            </View>
            {d.items.map((it, i) => {
              const meta = it.tag ? TAG_META[it.tag] : null;
              return (
                <View key={i} style={[styles.item, i > 0 && styles.itemBorder]}>
                  <View style={[styles.itemIcon, { backgroundColor: (meta?.color ?? Colors.textMuted) + '1E' }]}>
                    <Ionicons name={meta?.icon ?? 'ellipse'} size={15} color={meta?.color ?? Colors.textMuted} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemName, it.tag === 'interdit' && { color: Colors.red }]}>{it.name}</Text>
                    <Text style={styles.itemDetail}>{it.detail}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        ))}

        {/* Allures calibrées */}
        <View style={styles.paceCard}>
          <Text style={styles.paceTitle}>🏃 Mes allures (calibrées)</Text>
          {PERSONAL_PACES.map((p, i) => (
            <View key={i} style={[styles.item, i > 0 && styles.itemBorder]}>
              <View style={{ flex: 1 }}>
                <View style={styles.paceHead}>
                  <Text style={styles.itemName}>{p.zone}</Text>
                  <Text style={styles.paceValue}>{p.pace}</Text>
                </View>
                <Text style={styles.itemDetail}>{p.usage}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Socle minimum — semaines chargées */}
        <View style={styles.minCard}>
          <Text style={styles.minTitle}>🛟 Socle minimum — semaines sans temps</Text>
          <Text style={styles.homeIntro}>
            ~2 h/semaine pour ne pas arriver « à froid » au camp d'août. Passer de
            rien à tout d'un coup, c'est le schéma classique de la blessure.
          </Text>
          {PERSONAL_MINIMUM.map((d, i) => (
            <View key={i} style={[styles.item, i > 0 && styles.itemBorder]}>
              <View style={[styles.itemIcon, { backgroundColor: Colors.green + '1E' }]}>
                <Text style={[styles.homeMin, { color: Colors.green }]}>{d.minutes}'</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{d.name}</Text>
                <Text style={styles.itemDetail}>{d.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Routine maison quotidienne (panier perso) */}
        <View style={styles.homeCard}>
          <Text style={styles.homeTitle}>🏠 Routine maison — quotidienne</Text>
          <Text style={styles.homeIntro}>
            Le tir progresse par la FRÉQUENCE : 100 tirs chaque jour valent mieux que
            700 une fois par semaine. Ton panier à domicile est ton meilleur atout.
          </Text>
          {PERSONAL_HOME_ROUTINE.map((d, i) => (
            <View key={i} style={[styles.item, i > 0 && styles.itemBorder]}>
              <View style={[styles.itemIcon, { backgroundColor: Colors.orange + '1E' }]}>
                <Text style={styles.homeMin}>{d.minutes}'</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{d.name}</Text>
                <Text style={styles.itemDetail}>{d.detail}</Text>
              </View>
            </View>
          ))}
          <View style={styles.shortBox}>
            <Text style={styles.shortTitle}>Version courte (jeudi/vendredi, ~12 min — zéro saut)</Text>
            {PERSONAL_HOME_SHORT.map((d, i) => (
              <Text key={i} style={styles.shortItem}>• {d.name} — {d.detail}</Text>
            ))}
          </View>
        </View>

        {/* Travail sur panier réglable */}
        <View style={styles.rimCard}>
          <Text style={styles.rimTitle}>🎯 Panier réglable — travail de détente</Text>
          <Text style={styles.homeIntro}>
            Le saut avec cible bat le box jump : il déclenche une intention maximale
            naturelle, avec transfert direct sur le jeu. À traiter comme de la plyo.
          </Text>
          {PERSONAL_RIM_WORK.map((d, i) => (
            <View key={i} style={[styles.item, i > 0 && styles.itemBorder]}>
              <View style={[styles.itemIcon, { backgroundColor: Colors.primary + '1E' }]}>
                <Text style={[styles.homeMin, { color: Colors.primary }]}>{d.minutes}'</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{d.name}</Text>
                <Text style={styles.itemDetail}>{d.detail}</Text>
              </View>
            </View>
          ))}
          <View style={styles.shortBox}>
            {PERSONAL_RIM_RULES.map((r, i) => (
              <Text key={i} style={styles.shortItem}>⚠️ {r}</Text>
            ))}
          </View>
        </View>

        {/* Règles */}
        <View style={styles.rulesCard}>
          <Text style={styles.rulesTitle}>⚡ Règles non négociables</Text>
          {PERSONAL_RULES.map((r, i) => (
            <View key={i} style={styles.ruleRow}>
              <Text style={styles.ruleDot}>•</Text>
              <Text style={styles.ruleText}>{r}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.privateNote}>
          🔒 Écran personnel — absent des builds de production, contenu jamais commité.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  header:      { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  content:     { padding: Sp.md, paddingBottom: Sp.xxl, gap: Sp.sm },
  emptyText:   { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', marginTop: Sp.md, lineHeight: 20 },

  phaseRow:      { gap: Sp.xs, paddingBottom: Sp.xs },
  phaseChip:     { paddingHorizontal: Sp.md, paddingVertical: 8, borderRadius: 99, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  phaseChipActive:{ backgroundColor: Colors.primary, borderColor: Colors.primary },
  phaseChipText: { fontSize: Fs.sm, fontFamily: Fonts.medium, color: Colors.textSecondary },
  phaseChipTextActive: { color: Colors.onPrimary, fontFamily: Fonts.bold },

  goalCard:   { backgroundColor: Colors.primary + '10', borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: R, padding: Sp.md },
  blockLabel: { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  goalText:   { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 20, marginTop: 5 },

  dayCard:   { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: R, overflow: 'hidden' },
  dayHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: Sp.md, paddingVertical: Sp.sm, backgroundColor: Colors.surfaceElevated },
  dayName:   { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text },
  dayMuscu:  { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, flexShrink: 1, textAlign: 'right', marginLeft: Sp.sm },

  item:       { flexDirection: 'row', gap: Sp.sm, padding: Sp.md, alignItems: 'flex-start' },
  itemBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  itemIcon:   { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  itemName:   { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text },
  itemDetail: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 18, marginTop: 3 },

  homeCard:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.orange + '35', borderRadius: R, overflow: 'hidden', marginTop: Sp.sm, paddingBottom: Sp.sm },
  homeTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.orange, paddingHorizontal: Sp.md, paddingTop: Sp.md },
  homeIntro: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 18, paddingHorizontal: Sp.md, paddingVertical: Sp.sm },
  homeMin:   { fontSize: Fs.xs, fontFamily: Fonts.bold, color: Colors.orange },
  shortBox:  { marginHorizontal: Sp.md, marginTop: Sp.sm, padding: Sp.sm, borderRadius: 10, backgroundColor: Colors.surfaceElevated },
  shortTitle:{ fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary, marginBottom: 4 },
  shortItem: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 17 },
  paceCard:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.blue + '35', borderRadius: R, overflow: 'hidden', marginTop: Sp.sm, paddingBottom: Sp.sm },
  paceTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.blue, paddingHorizontal: Sp.md, paddingTop: Sp.md, paddingBottom: Sp.xs },
  paceHead:  { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Sp.sm },
  paceValue: { fontSize: Fs.sm, fontFamily: Fonts.condensedBold, color: Colors.blue },
  minCard:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.green + '35', borderRadius: R, overflow: 'hidden', marginTop: Sp.sm, paddingBottom: Sp.sm },
  minTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.green, paddingHorizontal: Sp.md, paddingTop: Sp.md },
  rimCard:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: R, overflow: 'hidden', marginTop: Sp.sm, paddingBottom: Sp.sm },
  rimTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.primary, paddingHorizontal: Sp.md, paddingTop: Sp.md },
  rulesCard:  { backgroundColor: Colors.red + '0E', borderWidth: 1, borderColor: Colors.red + '30', borderRadius: R, padding: Sp.md, marginTop: Sp.sm },
  rulesTitle: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.red, marginBottom: Sp.sm },
  ruleRow:    { flexDirection: 'row', gap: 6, marginBottom: 6 },
  ruleDot:    { color: Colors.red, fontSize: Fs.sm },
  ruleText:   { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 18 },

  privateNote:{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', marginTop: Sp.md },
});
