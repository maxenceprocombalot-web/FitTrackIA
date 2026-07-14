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
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';
import * as storage from '../../services/storage';

const SCREEN_W = Dimensions.get('window').width;

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
  const store  = useAppStore();
  const [filter, setFilter] = useState<Filter>('all');

  const todayWorkouts = store.workouts.filter(w => w.date === storage.today());
  const filtered = filter === 'all' ? store.workouts : store.workouts.filter(w => w.type === filter);

  const totalBurned  = todayWorkouts.reduce((s, w) => s + w.caloriesBurned, 0);
  const totalMinutes = todayWorkouts.reduce((s, w) => s + w.duration, 0);

  // Dernière séance enregistrée (la plus récente)
  const lastWorkout = store.workouts[0] ?? null;

  return (
    <AnimatedScreen style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Carte Programmes ───────────────────────────────────────────── */}
        <TouchableOpacity style={styles.programsCard} onPress={() => router.push('/(tabs)/programs')} activeOpacity={0.8}>
          <View style={styles.programsIconBox}>
            <Text style={styles.programsEmoji}>📋</Text>
          </View>
          <View style={styles.programsText}>
            <Text style={styles.programsTitle}>Programmes d'entraînement</Text>
            <Text style={styles.programsSub}>Full Body, PPL, Upper/Lower…</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.primary} />
        </TouchableOpacity>

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
        {filtered.length === 0 ? (
          <EmptyWorkout onAdd={() => router.push('/modals/add-workout')} />
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

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <TouchableOpacity style={styles.fab} onPress={() => router.push('/modals/add-workout')}>
        <Ionicons name="add" size={28} color={Colors.onPrimary} />
      </TouchableOpacity>
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
        <Ionicons name="trash-outline" size={22} color="#fff" />
        <Text style={swipeStyles.bgText}>Supprimer</Text>
      </View>

      <Animated.View
        style={[swipeStyles.card, { transform: [{ translateX: panX }] }]}
        {...panResponder.panHandlers}
      >
        {/* Tap → détail de la séance */}
        <TouchableOpacity
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
          <Text style={swipeStyles.date}>{workout.date.slice(5).replace('-', '/')}</Text>
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
  bgText: { color: '#fff', fontSize: Fs.sm, fontFamily: Fonts.semibold },
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
    <TouchableOpacity
      style={[styles.chip, active && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EmptyWorkout({ onAdd }: { onAdd: () => void }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 60, gap: 12 }}>
      <Ionicons name="barbell-outline" size={56} color={Colors.textMuted} />
      <Text style={{ color: Colors.textSecondary, fontSize: Fs.lg, fontFamily: Fonts.semibold }}>Aucune séance</Text>
      <Text style={{ color: Colors.textMuted, fontSize: Fs.sm, fontFamily: Fonts.regular, textAlign: 'center' }}>Commence à enregistrer tes entraînements</Text>
      <TouchableOpacity style={{ backgroundColor: Colors.primary, borderRadius: R, paddingVertical: 10, paddingHorizontal: 20, marginTop: 8 }} onPress={onAdd}>
        <Text style={{ color: '#fff', fontFamily: Fonts.semibold }}>Ajouter une séance</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, paddingBottom: 100, gap: Sp.sm },
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
  programsEmoji: { fontSize: 22, fontFamily: Fonts.regular },
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
  toolRow: {
    flexDirection: 'row', alignItems: 'center', gap: Sp.sm,
    backgroundColor: Colors.blue + '10',
    borderRadius: R, borderWidth: 1, borderColor: Colors.blue + '30',
    padding: Sp.md,
  },
  toolTitle: { fontSize: Fs.sm, fontFamily: Fonts.bold, color: Colors.text },
  toolSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  statsRow: { flexDirection: 'row', gap: Sp.sm },
  filterScroll: { marginHorizontal: -Sp.md },
  filterContent: { paddingHorizontal: Sp.md, gap: Sp.xs },
  chip: { borderRadius: 99, paddingHorizontal: Sp.md, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  chipText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  fab: {
    position: 'absolute', bottom: 30, right: Sp.lg,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45, shadowRadius: 12, elevation: 8,
  },
});
