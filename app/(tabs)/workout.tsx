import { fmtDayMonth } from '../../services/date';
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Animated, PanResponder, Dimensions,
} from 'react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { WorkoutSession, WorkoutType } from '../../types';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { Colors, R, Sp, Fs, Fw, Fonts, Rr } from '../../constants/theme';
import { DisplayTitle, SectionLabel, RaisedCard, GoldButton, Fab } from '../../components/ui/design';
import * as storage from '../../services/storage';

const SCREEN_W = Dimensions.get('window').width;

// Écran personnel : visible en développement ET dans le build « perso »
// (profil EAS qui pose EXPO_PUBLIC_PERSO=1). Le profil « production » force
// cette variable à 0 → l'écran n'existe dans aucun build App Store.
const SHOW_PERSO = __DEV__ || process.env.EXPO_PUBLIC_PERSO === '1';

const TYPE_META: Record<WorkoutType, { label: string; icon: React.ComponentProps<typeof Ionicons>['name']; color: string }> = {
  strength: { label: 'Musculation', icon: 'barbell-outline',  color: Colors.primary },
  cardio:   { label: 'Cardio',      icon: 'bicycle-outline',  color: Colors.green },
  hiit:     { label: 'HIIT',        icon: 'flash-outline',    color: Colors.red },
  yoga:     { label: 'Yoga',        icon: 'body-outline',     color: '#b983ff' },
  running:  { label: 'Course',      icon: 'walk-outline',     color: Colors.orange },
  other:    { label: 'Autre',       icon: 'fitness-outline',  color: Colors.textSecondary },
};

type Filter = WorkoutType | 'all';

export default function WorkoutScreen() {
  const router = useRouter();
  const store  = useAppStore(['workouts', 'loading', 'activeProgram']);
  const [filter, setFilter] = useState<Filter>('all');

  const todayWorkouts = store.workouts.filter(w => w.date === storage.today());
  const filtered = filter === 'all' ? store.workouts : store.workouts.filter(w => w.type === filter);

  const totalBurned  = todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const totalMinutes = todayWorkouts.reduce((s, w) => s + w.duration, 0);

  // Dernière séance enregistrée (la plus récente)
  const lastWorkout = store.workouts[0] ?? null;

  // ── Programme actif et semaine en cours (maquette 1b) ──────────────────────
  const program    = store.activeProgram ? store.findProgram(store.activeProgram.programId) : null;
  const todayDOW   = ((new Date().getDay() + 6) % 7) + 1; // 1=Lundi … 7=Dimanche
  const todaySession = program?.sessions.find(sess => sess.dayOfWeek === todayDOW) ?? null;
  const nextSessions = program
    ? program.sessions.filter(sess => sess.dayOfWeek !== todayDOW).slice(0, 3)
    : [];
  const doneToday = todayWorkouts.length > 0;

  // Bandeau de semaine : les 7 jours à partir du lundi courant.
  const weekDays = (() => {
    const now   = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dow = (i + 1) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      return {
        letter: ['L', 'M', 'M', 'J', 'V', 'S', 'D'][i],
        num: d.getDate(),
        isToday: dow === todayDOW,
        // Un jour « programmé » porte une séance du programme actif.
        planned: !!program?.sessions.some(sess => sess.dayOfWeek === dow),
      };
    });
  })();

  return (
    <AnimatedScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Titre + bandeau de semaine (maquette 1b) ────────────────────── */}
        <DisplayTitle style={styles.screenTitle}>Entraînement</DisplayTitle>

        <View style={styles.weekStrip} accessibilityRole="header" accessibilityLabel="Semaine en cours">
          {weekDays.map((d, i) => (
            <View key={i} style={styles.weekCol}>
              <Text style={styles.weekLetter}>{d.letter}</Text>
              <View
                style={[
                  styles.weekPill,
                  d.planned && styles.weekPillPlanned,
                  d.isToday && styles.weekPillToday,
                ]}
              >
                <Text
                  style={[
                    styles.weekNum,
                    d.planned && styles.weekNumPlanned,
                    d.isToday && styles.weekNumToday,
                  ]}
                >
                  {d.num}
                </Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Programme actif : séance du jour puis suivantes (maquette 1b) ─ */}
        {program && (
          <>
            <SectionLabel style={styles.blockLabel}>
              Mon programme · {program.name}
            </SectionLabel>

            {todaySession ? (
              <RaisedCard style={styles.todayCard}>
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>
                    {doneToday ? 'TERMINÉE' : "AUJOURD'HUI"}
                  </Text>
                </View>
                <View style={styles.todayHead}>
                  <View style={styles.todayIcon}><Text style={styles.todayEmoji}>🏋️</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.todayTitle} numberOfLines={2}>{todaySession.name}</Text>
                    <Text style={styles.todaySub}>
                      {todaySession.exercises.length} exercice{todaySession.exercises.length > 1 ? 's' : ''} · {todaySession.focus}
                    </Text>
                  </View>
                </View>
                <GoldButton
                  title={doneToday ? 'Refaire la séance' : 'Démarrer la séance'}
                  onPress={() => router.push('/modals/add-workout')}
                  style={styles.todayCta}
                />
              </RaisedCard>
            ) : (
              <View style={styles.restCard}>
                <Text style={styles.restEmoji}>🌙</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.restTitle}>Repos aujourd'hui</Text>
                  <Text style={styles.restSub}>Aucune séance prévue par ton programme</Text>
                </View>
              </View>
            )}

            {nextSessions.map(sess => (
              <TouchableOpacity
                key={sess.id}
                style={styles.upcomingRow}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${sess.dayLabel} : ${sess.name}`}
                onPress={() => router.push({ pathname: '/programs/[id]', params: { id: program.id } })}
              >
                <View style={styles.upcomingIcon}><Text style={{ fontSize: 20 }}>🦵</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.upcomingTitle} numberOfLines={1}>{sess.name}</Text>
                  <Text style={styles.upcomingSub}>
                    {sess.dayLabel} · {sess.exercises.length} exercice{sess.exercises.length > 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </>
        )}

        {/* ── Carte Programmes ───────────────────────────────────────────── */}
        <TouchableOpacity style={styles.programsCard} onPress={() => router.push('/(tabs)/programs')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Ouvrir les programmes d'entraînement">
          <View style={styles.programsIconBox}>
            <Text style={styles.programsEmoji}>📋</Text>
          </View>
          <View style={styles.programsText}>
            <Text style={styles.programsTitle}>Programmes d'entraînement</Text>
            <Text style={styles.programsSub}>Full Body, PPL, Upper/Lower…</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

        {/* ── Bloc athlétique PERSONNEL (dev uniquement, jamais en prod) ──── */}
        {SHOW_PERSO && (
          <TouchableOpacity
            style={styles.persoRow}
            onPress={() => router.push('/modals/perso-athletique')}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ouvrir mon bloc athlétique basket"
          >
            <Text style={{ fontSize: 20 }}>🏀</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.persoTitle}>Mon bloc athlétique</Text>
              <Text style={styles.persoSub}>Plyo · endurance · skills — calé sur ta prépa force</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {/* ── Calculateur de charge ──────────────────────────────────────── */}
        <TouchableOpacity style={styles.toolRow} onPress={() => router.push('/modals/plate-calculator')} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel="Ouvrir le calculateur de charge">
          <Ionicons name="calculator-outline" size={18} color={Colors.blue} />
          <View style={{ flex: 1 }}>
            <Text style={styles.toolTitle}>🏋️ Calculateur de charge</Text>
            <Text style={styles.toolSub}>Quels disques mettre par côté</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {/* ── Reprendre la dernière séance ───────────────────────────────── */}
        {lastWorkout && (
          <TouchableOpacity
            style={styles.repeatBtn}
            onPress={() => router.push({ pathname: '/modals/add-workout', params: { repeatWorkoutId: lastWorkout.id } })}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`Reprendre la dernière séance : ${lastWorkout.name}`}
          >
            <Ionicons name="flash" size={18} color={Colors.orange} />
            <View style={{ flex: 1 }}>
              <Text style={styles.repeatBtnTitle}>⚡ Reprendre la dernière séance</Text>
              <Text style={styles.repeatBtnSub}>{lastWorkout.name} — {lastWorkout.exercises.length} exercice{lastWorkout.exercises.length > 1 ? 's' : ''}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* ── Stats du jour ──────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <MiniStat icon="barbell-outline"  color={Colors.primary} value={String(todayWorkouts.length)} label="Séances" />
          <MiniStat icon="flame-outline"    color={Colors.orange}  value={String(totalBurned)}         label="kcal" />
          <MiniStat icon="time-outline"     color={Colors.green}   value={String(totalMinutes)}        label="min" />
        </View>

        {/* ── Filtres ────────────────────────────────────────────────────── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
          <FilterChip label="Tout" active={filter === 'all'} onPress={() => setFilter('all')} />
          {(Object.keys(TYPE_META) as WorkoutType[]).map(t => (
            <FilterChip
              key={t}
              label={TYPE_META[t].label}
              active={filter === t}
              color={TYPE_META[t].color}
              onPress={() => setFilter(t)}
            />
          ))}
        </ScrollView>

        {/* ── Liste des séances ──────────────────────────────────────────── */}
        {store.workouts.length > 0 && (
          <View style={styles.resultsHeader}>
            <Text style={styles.resultsTitle}>Mes séances</Text>
            <View style={styles.resultCountPill}>
              <Text style={styles.resultCountText}>{filtered.length}</Text>
            </View>
          </View>
        )}

        {filtered.length === 0 ? (
          filter === 'all' ? (
            <EmptyWorkout onAdd={() => router.push('/modals/add-workout')} />
          ) : (
            <NoWorkoutMatch label={TYPE_META[filter].label} onReset={() => setFilter('all')} />
          )
        ) : (
          filtered.map((w, idx) => (
            <SwipeableWorkoutCard
              key={w.id}
              workout={w}
              index={idx}
              onDelete={() => store.deleteWorkout(w.id)}
            />
          ))
        )}
      </ScrollView>

      {/* ── FAB (maquette 1b) ────────────────────────────────────────────── */}
      <Fab onPress={() => router.push('/modals/add-workout')} label="Ajouter une séance" />
    </AnimatedScreen>
  );
}

// ─── Carte séance avec swipe pour supprimer + tap pour le détail ─────────────

function SwipeableWorkoutCard({ workout, index, onDelete }: {
  workout: WorkoutSession;
  index: number;
  onDelete: () => void;
}) {
  const router   = useRouter();
  const panX     = useRef(new Animated.Value(0)).current;
  const slideIn  = useRef(new Animated.Value(40)).current;
  const opacity  = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity,  { toValue: 1, duration: 300, delay: index * 50, useNativeDriver: true }),
      Animated.timing(slideIn,  { toValue: 0, duration: 280, delay: index * 50, useNativeDriver: true }),
    ]).start();
  }, []);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dy) < 20,
    onPanResponderMove: (_, g) => { if (g.dx < 0) panX.setValue(Math.max(g.dx, -SCREEN_W)); },
    onPanResponderRelease: (_, g) => {
      if (g.dx < -90) {
        // Snap vers la zone "supprimer", puis demande confirmation
        Animated.spring(panX, { toValue: -100, useNativeDriver: true }).start();
        Alert.alert(
          'Supprimer cette séance ?',
          `"${workout.name}" sera supprimée définitivement.`,
          [
            { text: 'Annuler', style: 'cancel', onPress: () => Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start() },
            { text: 'Supprimer', style: 'destructive', onPress: () => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Animated.timing(panX, { toValue: -SCREEN_W, duration: 220, useNativeDriver: true }).start(onDelete);
              },
            },
          ],
        );
      } else {
        Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
      }
    },
  })).current;

  const { label, icon, color } = TYPE_META[workout.type];
  const isToday = workout.date === storage.today();

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slideIn }] }}>
      {/* Fond rouge visible au swipe */}
      <View style={swipeStyles.bg}>
        <Ionicons name="trash-outline" size={22} color={Colors.onPrimary} />
        <Text style={swipeStyles.bgText}>Supprimer</Text>
      </View>

      <Animated.View
        style={[swipeStyles.card, { transform: [{ translateX: panX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Tap → détail de la séance */}
        <TouchableOpacity accessibilityRole="button"
          activeOpacity={0.8}
          onPress={() => router.push({ pathname: '/modals/workout-detail', params: { id: workout.id } })}
          style={swipeStyles.cardInner}
        >
          <View style={[swipeStyles.iconBox, { backgroundColor: color + '18' }]}>
            <Ionicons name={icon} size={22} color={color} />
          </View>
          <View style={swipeStyles.info}>
            <View style={swipeStyles.titleRow}>
              <Text style={swipeStyles.name}>{workout.name}</Text>
              {isToday && <View style={swipeStyles.todayBadge}><Text style={swipeStyles.todayText}>Aujourd'hui</Text></View>}
            </View>
            <Text style={swipeStyles.meta}>
              {label} • {workout.duration}min • {workout.caloriesBurned}kcal
            </Text>
            {workout.exercises.length > 0 && (
              <Text style={swipeStyles.exCount}>{workout.exercises.length} exercice{workout.exercises.length > 1 ? 's' : ''}</Text>
            )}
          </View>
          <Text style={swipeStyles.date}>{fmtDayMonth(workout.date)}</Text>
          <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

const swipeStyles = StyleSheet.create({
  bg: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: 110, borderRadius: R, backgroundColor: Colors.red,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: Sp.sm,
  },
  bgText: { color: Colors.onPrimary, fontSize: Fs.sm, fontFamily: Fonts.semibold },
  card: {
    backgroundColor: Colors.surface, borderRadius: R,
    borderWidth: 1, borderColor: Colors.border,
    marginBottom: Sp.sm, overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row', alignItems: 'center',
    padding: Sp.md, gap: Sp.sm,
  },
  iconBox: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  name: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text },
  todayBadge: { backgroundColor: Colors.primary + '25', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  todayText: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.primary },
  meta: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  exCount: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  date: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
});

// ─── Sous-composants ──────────────────────────────────────────────────────────

function MiniStat({ icon, color, value, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; color: string; value: string; label: string }) {
  return (
    <View style={miniStyles.card}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[miniStyles.value, { color }]}>{value}</Text>
      <Text style={miniStyles.label}>{label}</Text>
    </View>
  );
}
const miniStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, alignItems: 'center', gap: 3 },
  value: { fontSize: Fs.xl, fontFamily: Fonts.bold },
  label: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
});

function FilterChip({ label, active, color = Colors.primary, onPress }: { label: string; active: boolean; color?: string; onPress: () => void }) {
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.chip, active && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyWorkout({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="barbell-outline" size={30} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Aucune séance</Text>
      <Text style={styles.emptySub}>Commence à enregistrer tes entraînements</Text>
      <Button title="+ Ma première séance" onPress={onAdd} fullWidth={false} style={{ marginTop: 8, paddingHorizontal: 20 }} />
    </View>
  );
}

// Aucun résultat pour le filtre actif (≠ « aucune séance enregistrée »)
function NoWorkoutMatch({ label, onReset }: { label: string; onReset: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIconBox}>
        <Ionicons name="search-outline" size={30} color={Colors.textMuted} />
      </View>
      <Text style={styles.emptyTitle}>Aucune séance « {label} »</Text>
      <Text style={styles.emptySub}>Aucune séance ne correspond à ce filtre.</Text>
      <TouchableOpacity
        style={styles.emptyBtn}
        onPress={onReset}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Afficher toutes les séances"
      >
        <Ionicons name="refresh-outline" size={16} color={Colors.primary} />
        <Text style={styles.emptyBtnText}>Afficher tout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, paddingBottom: 100, gap: Sp.sm },

  // ── Maquette 1b : titre, bandeau de semaine, programme actif ──────────────
  screenTitle: { marginTop: Sp.xs, marginBottom: Sp.xs },
  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Sp.sm },
  weekCol: { alignItems: 'center', gap: 6 },
  weekLetter: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  weekPill: {
    width: 34, height: 34, borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  weekPillPlanned: { backgroundColor: 'rgba(232,184,75,0.16)' },
  weekPillToday: { backgroundColor: Colors.primary },
  weekNum: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  weekNumPlanned: { color: Colors.primary },
  weekNumToday: { color: Colors.onPrimary, fontFamily: Fonts.bold },

  blockLabel: { marginTop: Sp.xs },
  todayCard: { gap: 0 },
  todayBadge: {
    position: 'absolute', top: 14, right: 14, zIndex: 2,
    backgroundColor: Colors.primary, borderRadius: 999,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  todayBadgeText: { fontSize: 10, fontFamily: Fonts.bold, color: Colors.onPrimary, letterSpacing: 0.4 },
  todayHead: { flexDirection: 'row', alignItems: 'center', gap: 13, paddingRight: 90 },
  todayIcon: {
    width: 50, height: 50, borderRadius: Rr.field,
    backgroundColor: 'rgba(232,184,75,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  todayEmoji: { fontSize: 22 },
  todayTitle: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text },
  todaySub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 1 },
  todayCta: { marginTop: 14 },

  restCard: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: Colors.surface, borderRadius: Rr.card,
    borderWidth: 1, borderColor: Colors.border, padding: Sp.md,
  },
  restEmoji: { fontSize: 24 },
  restTitle: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text },
  restSub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 1 },

  upcomingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: Colors.surface, borderRadius: Rr.panel,
    borderWidth: 1, borderColor: Colors.border, padding: 15,
    opacity: 0.9,
  },
  upcomingIcon: {
    width: 46, height: 46, borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  upcomingTitle: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text },
  upcomingSub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 1 },
  // Carte Programmes
  programsCard: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.md,
    backgroundColor: Colors.primary + '14',
    borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '35',
    padding: Sp.md,
  },
  programsIconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.primary + '22',
    alignItems: 'center', justifyContent: 'center',
  },
  programsEmoji: { fontSize: 22 },
  programsText: { flex: 1 },
  programsTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text },
  programsSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  // Bouton reprendre dernière séance
  repeatBtn: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    backgroundColor: Colors.orange + '12',
    borderRadius: R, borderWidth: 1, borderColor: Colors.orange + '35',
    padding: Sp.md,
  },
  repeatBtnTitle: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.text },
  repeatBtnSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  persoRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, backgroundColor: Colors.primary + '12', borderRadius: R, borderWidth: 1, borderColor: Colors.borderStrong, padding: Sp.md },
  persoTitle: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.text },
  persoSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    backgroundColor: Colors.blue + '10',
    borderRadius: R, borderWidth: 1, borderColor: Colors.blue + '30',
    padding: Sp.md,
  },
  toolTitle: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.text },
  toolSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Sp.sm },
  // En-tête de liste
  resultsHeader: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, marginTop: Sp.sm, marginBottom: 2 },
  resultsTitle: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  resultCountPill: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceHighlight },
  resultCountText: { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  // États vides
  empty: { alignItems: 'center', paddingVertical: 48, gap: Sp.sm },
  emptyIconBox: { width: 64, height: 64, borderRadius: 20, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: Fs.lg, fontFamily: Fonts.semibold, color: Colors.textSecondary, textAlign: 'center' },
  emptySub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Sp.lg },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Sp.sm, paddingHorizontal: Sp.md, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '12' },
  emptyBtnText: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.primary },
  filterScroll: { marginHorizontal: -Sp.md },
  filterContent: { paddingHorizontal: Sp.md, gap: Sp.xs },
  chip: { borderRadius: 99, paddingHorizontal: Sp.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
});
