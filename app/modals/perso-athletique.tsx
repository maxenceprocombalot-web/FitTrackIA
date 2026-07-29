import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getSecure, setSecure } from '../../services/storage';
import {
  PERSONAL_BLOCS, PERSONAL_RULES, PERSONAL_HOME_ROUTINE,
  PERSONAL_RIM_WORK, PERSONAL_PACES, AthleticItem, Exo,
} from '../../constants/personal-program';
import { Colors, R, Sp, Fs, Fonts, tapSlop } from '../../constants/theme';

// Écran PERSONNEL : programme de force complet + travail basket intégré.
// Visible seulement si SHOW_PERSO (dev ou build « perso ») — voir workout.tsx.

const TAG_META: Record<NonNullable<AthleticItem['tag']>, { color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = {
  plyo:       { color: Colors.primary, icon: 'flash' },
  endurance:  { color: Colors.blue,    icon: 'pulse' },
  skills:     { color: Colors.orange,  icon: 'basketball' },
  prevention: { color: Colors.green,   icon: 'shield-checkmark' },
  interdit:   { color: Colors.red,     icon: 'ban' },
};

const WEEKDAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const orderKey = (blocId: string) => `@fit_perso_order_${blocId}`;
const POS_KEY = '@fit_perso_position';

// Position de départ : bloc « Effort max », semaine 2 (situation actuelle).
// Ensuite l'app mémorise le dernier choix pour suivre la progression.
const DEFAULT_BLOC = 0;
const DEFAULT_WEEK = 1;

export default function PersoAthletiqueScreen() {
  const router = useRouter();
  const [blocIdx, setBlocIdx]   = useState(DEFAULT_BLOC);
  const [weekIdx, setWeekIdx]   = useState(DEFAULT_WEEK);
  const [order, setOrder]       = useState<number[]>([]);
  const [swapFrom, setSwapFrom] = useState<number | null>(null);
  const [tab, setTab]           = useState<'semaine' | 'basket'>('semaine');

  const bloc = PERSONAL_BLOCS[blocIdx];

  // Restaure la dernière position consultée
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const raw = await getSecure(POS_KEY);
        if (!raw || !alive) return;
        const p = JSON.parse(raw) as { bloc: number; week: number };
        if (typeof p?.bloc === 'number' && PERSONAL_BLOCS[p.bloc]) {
          setBlocIdx(p.bloc);
          const max = PERSONAL_BLOCS[p.bloc].weeks - 1;
          if (typeof p.week === 'number') setWeekIdx(Math.min(Math.max(p.week, 0), max));
        }
      } catch { /* valeurs par défaut */ }
    })();
    return () => { alive = false; };
  }, []);

  // Ordre des jours mémorisé par bloc
  useEffect(() => {
    let alive = true;
    (async () => {
      const identity = (bloc?.semaine ?? []).map((_, i) => i);
      try {
        if (!bloc) { if (alive) setOrder([]); return; }
        const raw = await getSecure(orderKey(bloc.id));
        const saved = raw ? (JSON.parse(raw) as number[]) : null;
        const valid = Array.isArray(saved) && saved.length === identity.length
          && [...saved].sort((a, b) => a - b).every((v, i) => v === i);
        if (alive) setOrder(valid ? saved! : identity);
      } catch {
        if (alive) setOrder(identity);
      }
    })();
    return () => { alive = false; };
  }, [bloc?.id]);

  // La semaine sélectionnée doit rester valide en changeant de bloc
  useEffect(() => { setWeekIdx(w => Math.min(w, (bloc?.weeks ?? 1) - 1)); }, [bloc?.id]);

  const persist = useCallback(async (next: number[]) => {
    setOrder(next);
    if (!bloc) return;
    try { await setSecure(orderKey(bloc.id), JSON.stringify(next)); } catch { /* non bloquant */ }
  }, [bloc?.id]);

  const swap = useCallback((a: number, b: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const next = [...order];
    [next[a], next[b]] = [next[b], next[a]];
    persist(next);
    setSwapFrom(null);
  }, [order, persist]);

  // Mémorise la position (non bloquant)
  useEffect(() => {
    setSecure(POS_KEY, JSON.stringify({ bloc: blocIdx, week: weekIdx })).catch(() => {});
  }, [blocIdx, weekIdx]);

  const isCustom = order.some((v, i) => v !== i);

  if (!bloc) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="lock-closed-outline" size={44} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Aucun programme personnel chargé.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={tapSlop}>
          <Ionicons name="arrow-back" size={22} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mon programme</Text>
      </View>

      {/* Onglets */}
      <View style={styles.tabs}>
        {(['semaine', 'basket'] as const).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => { Haptics.selectionAsync(); setTab(t); }}
            accessibilityRole="button"
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'semaine' ? '📅 Ma semaine' : '🏀 Basket & allures'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {tab === 'semaine' ? (
          <>
            {/* Bloc */}
            <Text style={styles.label}>Bloc</Text>
            <View style={styles.chipRow}>
              {PERSONAL_BLOCS.map((b, i) => (
                <TouchableOpacity
                  key={b.id}
                  style={[styles.chip, i === blocIdx && styles.chipActive]}
                  onPress={() => { Haptics.selectionAsync(); setBlocIdx(i); }}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, i === blocIdx && styles.chipTextActive]}>{b.title}</Text>
                  <Text style={[styles.chipSub, i === blocIdx && styles.chipTextActive]}>{b.weeks} sem.</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Semaine */}
            <Text style={styles.label}>Semaine en cours</Text>
            <View style={styles.chipRow}>
              {bloc.weekLabels.map((w, i) => (
                <TouchableOpacity
                  key={w}
                  style={[styles.weekChip, i === weekIdx && styles.chipActive]}
                  onPress={() => { Haptics.selectionAsync(); setWeekIdx(i); }}
                  accessibilityRole="button"
                >
                  <Text style={[styles.chipText, i === weekIdx && styles.chipTextActive]}>{w}</Text>
                  {i === weekIdx && <Text style={styles.chipSubActive}>en cours</Text>}
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.focusCard}>
              <Text style={styles.focusLabel}>💪 FORCE</Text>
              <Text style={styles.focusText}>{bloc.focus}</Text>
              <Text style={[styles.focusLabel, { marginTop: Sp.sm }]}>🏀 BASKET</Text>
              <Text style={styles.focusText}>{bloc.athleticGoal}</Text>
            </View>

            <View style={styles.hintRow}>
              <Ionicons name="swap-vertical" size={13} color={Colors.textSecondary} />
              <Text style={styles.hintText}>Touche ⇅ pour déplacer une journée.</Text>
              {isCustom && (
                <TouchableOpacity onPress={() => persist(bloc.semaine.map((_, i) => i))} hitSlop={tapSlop} accessibilityRole="button">
                  <Text style={styles.resetLink}>Réinitialiser</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Journées */}
            {order.map((jIdx, slot) => {
              const j = bloc.semaine[jIdx];
              if (!j) return null;
              const moved = jIdx !== slot;
              return (
                <View key={`${slot}_${jIdx}`} style={[styles.dayCard, moved && styles.dayCardMoved]}>
                  <View style={styles.dayHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.dayName}>{WEEKDAYS[slot]}</Text>
                      <Text style={styles.daySeance}>{j.seance ?? 'Pas de muscu'}</Text>
                      {moved && <Text style={styles.movedTag}>déplacé depuis {WEEKDAYS[jIdx]}</Text>}
                    </View>
                    <TouchableOpacity
                      onPress={() => { Haptics.selectionAsync(); setSwapFrom(slot); }}
                      style={styles.swapBtn} hitSlop={tapSlop}
                      accessibilityRole="button"
                      accessibilityLabel={`Déplacer la journée de ${WEEKDAYS[slot]}`}
                    >
                      <Ionicons name="swap-vertical" size={17} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>

                  {/* Exercices de force */}
                  {j.exos.map((e: Exo, i) => (
                    <View key={i} style={styles.exoRow}>
                      <Text style={styles.exoNum}>{i + 1}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.exoName}>{e.name}</Text>
                        <View style={styles.exoMeta}>
                          <Text style={styles.exoMetaText}>{e.series} séries</Text>
                          <Text style={styles.exoDot}>·</Text>
                          <Text style={styles.exoMetaText}>{e.reps}</Text>
                          <Text style={styles.exoDot}>·</Text>
                          <Text style={styles.exoMetaText}>repos {e.rest}</Text>
                        </View>
                        {e.note && <Text style={styles.exoNote}>{e.note}</Text>}
                      </View>
                      {(e.loads?.[weekIdx] || e.load) && (
                        <View style={styles.loadBadge}>
                          <Text style={styles.loadText}>{e.loads?.[weekIdx] ?? e.load}</Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Travail basket du jour */}
                  {j.athletic.map((it, i) => {
                    const meta = it.tag ? TAG_META[it.tag] : null;
                    return (
                      <View key={`a${i}`} style={[styles.athRow, i === 0 && j.exos.length > 0 && styles.athFirst]}>
                        <View style={[styles.athIcon, { backgroundColor: (meta?.color ?? Colors.textMuted) + '1E' }]}>
                          <Ionicons name={meta?.icon ?? 'ellipse'} size={14} color={meta?.color ?? Colors.textMuted} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.athName, it.tag === 'interdit' && { color: Colors.red }]}>{it.name}</Text>
                          <Text style={styles.athDetail}>{it.detail}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            })}

            <View style={styles.rulesCard}>
              <Text style={styles.rulesTitle}>⚡ Règles non négociables</Text>
              {PERSONAL_RULES.map((r, i) => (
                <View key={i} style={styles.ruleRow}>
                  <Text style={styles.ruleDot}>•</Text>
                  <Text style={styles.ruleText}>{r}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Routine maison */}
            <View style={styles.blockCard}>
              <Text style={[styles.blockTitle, { color: Colors.orange }]}>🏠 Routine maison — quotidienne</Text>
              <Text style={styles.blockIntro}>
                Le tir progresse par la FRÉQUENCE : 100 tirs chaque jour valent mieux que
                700 une fois par semaine. Ton panier à domicile est ton meilleur atout.
              </Text>
              {PERSONAL_HOME_ROUTINE.map((d, i) => (
                <View key={i} style={styles.drillRow}>
                  <View style={[styles.athIcon, { backgroundColor: Colors.orange + '1E' }]}>
                    <Text style={[styles.minText, { color: Colors.orange }]}>{d.minutes}'</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.athName}>{d.name}</Text>
                    <Text style={styles.athDetail}>{d.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Panier réglable */}
            <View style={styles.blockCard}>
              <Text style={[styles.blockTitle, { color: Colors.primary }]}>🎯 Panier réglable — détente</Text>
              <Text style={styles.blockIntro}>
                Le saut avec cible bat le box jump : intention maximale naturelle, transfert
                direct sur le jeu. À traiter comme de la plyo (jamais jeudi/vendredi).
              </Text>
              {PERSONAL_RIM_WORK.map((d, i) => (
                <View key={i} style={styles.drillRow}>
                  <View style={[styles.athIcon, { backgroundColor: Colors.primary + '1E' }]}>
                    <Text style={[styles.minText, { color: Colors.primary }]}>{d.minutes}'</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.athName}>{d.name}</Text>
                    <Text style={styles.athDetail}>{d.detail}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Allures */}
            <View style={styles.blockCard}>
              <Text style={[styles.blockTitle, { color: Colors.blue }]}>🏃 Mes allures</Text>
              {PERSONAL_PACES.map((p, i) => (
                <View key={i} style={styles.drillRow}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.paceHead}>
                      <Text style={styles.athName}>{p.zone}</Text>
                      <Text style={styles.paceValue}>{p.pace}</Text>
                    </View>
                    {p.hr && <Text style={styles.paceHr}>❤️ {p.hr}</Text>}
                    <Text style={styles.athDetail}>{p.usage}</Text>
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.privateNote}>🔒 Écran personnel — absent des builds App Store.</Text>
      </ScrollView>

      {/* Choix du jour de destination */}
      <Modal visible={swapFrom !== null} transparent animationType="fade" onRequestClose={() => setSwapFrom(null)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setSwapFrom(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              Déplacer {swapFrom !== null ? WEEKDAYS[swapFrom] : ''} vers…
            </Text>
            <Text style={styles.sheetSub}>Les deux journées seront échangées.</Text>
            {WEEKDAYS.map((wd, i) => {
              if (i === swapFrom) return null;
              const target = bloc.semaine[order[i]];
              return (
                <TouchableOpacity key={wd} style={styles.sheetRow} onPress={() => swap(swapFrom!, i)} accessibilityRole="button">
                  <Text style={styles.sheetDay}>{wd}</Text>
                  <Text style={styles.sheetMuscu} numberOfLines={1}>{target?.seance ?? 'Pas de muscu'}</Text>
                  <Ionicons name="swap-horizontal" size={16} color={Colors.primary} />
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity style={styles.sheetCancel} onPress={() => setSwapFrom(null)} accessibilityRole="button">
              <Text style={styles.sheetCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: Colors.bg },
  center:      { alignItems: 'center', justifyContent: 'center', padding: Sp.lg },
  header:      { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  content:     { padding: Sp.md, paddingBottom: Sp.xxl, gap: Sp.sm },
  emptyText:   { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', marginTop: Sp.md },

  tabs:         { flexDirection: 'row', gap: Sp.xs, padding: Sp.md, paddingBottom: 0 },
  tab:          { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: R, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  tabActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  tabText:      { fontSize: Fs.sm, fontFamily: Fonts.medium, color: Colors.textSecondary },
  tabTextActive:{ color: Colors.onPrimary, fontFamily: Fonts.bold },

  label:    { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: Sp.xs },
  chipRow:  { flexDirection: 'row', gap: Sp.xs },
  chip:     { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: R, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  weekChip: { flex: 1, alignItems: 'center', paddingVertical: 11, borderRadius: R, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border },
  chipActive:   { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText:     { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text },
  chipSub:      { fontSize: 10, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },
  chipTextActive: { color: Colors.onPrimary },
  chipSubActive:  { fontSize: 9, fontFamily: Fonts.medium, color: Colors.onPrimary, opacity: 0.8, marginTop: 1 },

  focusCard:  { backgroundColor: Colors.primary + '0E', borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: R, padding: Sp.md, marginTop: Sp.xs },
  focusLabel: { fontSize: Fs.xs, fontFamily: Fonts.bold, color: Colors.primary, letterSpacing: 0.5 },
  focusText:  { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 18, marginTop: 3 },

  hintRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Sp.xs },
  hintText:  { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  resetLink: { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.primary },

  dayCard:      { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: R, overflow: 'hidden' },
  dayCardMoved: { borderColor: Colors.primary + '55' },
  dayHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Sp.md, paddingVertical: Sp.sm, backgroundColor: Colors.surfaceElevated },
  dayName:      { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text },
  daySeance:    { fontSize: Fs.xs, fontFamily: Fonts.medium, color: Colors.primary, marginTop: 1 },
  movedTag:     { fontSize: 10, fontFamily: Fonts.medium, color: Colors.primary, marginTop: 1 },
  swapBtn:      { padding: 6 },

  exoRow:      { flexDirection: 'row', alignItems: 'flex-start', gap: Sp.sm, paddingHorizontal: Sp.md, paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  exoNum:      { fontSize: Fs.xs, fontFamily: Fonts.condensedBold, color: Colors.textMuted, width: 14, marginTop: 2 },
  exoName:     { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text },
  exoMeta:     { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 4, marginTop: 2 },
  exoMetaText: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  exoDot:      { fontSize: Fs.xs, color: Colors.textMuted },
  exoNote:     { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 3, lineHeight: 16, fontStyle: 'italic' },
  loadBadge:   { backgroundColor: Colors.primary, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 5 },
  loadText:    { fontSize: Fs.sm, fontFamily: Fonts.condensedBold, color: Colors.onPrimary },

  athRow:    { flexDirection: 'row', gap: Sp.sm, paddingHorizontal: Sp.md, paddingVertical: 9, alignItems: 'flex-start' },
  athFirst:  { borderTopWidth: 1, borderTopColor: Colors.borderStrong, marginTop: 2, paddingTop: 11 },
  athIcon:   { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  athName:   { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text },
  athDetail: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 17, marginTop: 2 },
  minText:   { fontSize: Fs.xs, fontFamily: Fonts.bold },

  blockCard:  { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, borderRadius: R, padding: Sp.md, gap: 2 },
  blockTitle: { fontSize: Fs.md, fontFamily: Fonts.bold },
  blockIntro: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 17, marginBottom: Sp.sm },
  drillRow:   { flexDirection: 'row', gap: Sp.sm, paddingVertical: 8, alignItems: 'flex-start' },
  paceHead:   { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: Sp.sm },
  paceValue:  { fontSize: Fs.sm, fontFamily: Fonts.condensedBold, color: Colors.blue },
  paceHr:     { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.red, marginTop: 2 },

  rulesCard:  { backgroundColor: Colors.red + '0E', borderWidth: 1, borderColor: Colors.red + '30', borderRadius: R, padding: Sp.md, marginTop: Sp.sm },
  rulesTitle: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.red, marginBottom: Sp.sm },
  ruleRow:    { flexDirection: 'row', gap: 6, marginBottom: 6 },
  ruleDot:    { color: Colors.red, fontSize: Fs.sm },
  ruleText:   { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 17 },

  privateNote: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', marginTop: Sp.md },

  overlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet:      { backgroundColor: Colors.surface, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: Sp.lg, paddingBottom: 40 },
  sheetTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text },
  sheetSub:   { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: Sp.sm },
  sheetRow:   { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sheetDay:   { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text, width: 96 },
  sheetMuscu: { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  sheetCancel:{ alignItems: 'center', paddingVertical: Sp.md, marginTop: Sp.sm },
  sheetCancelText: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.textSecondary },
});
