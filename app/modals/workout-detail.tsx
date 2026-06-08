import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppStore } from '../../store/useAppStore';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';

const TYPE_LABELS: Record<string, string> = {
  strength: 'Musculation',
  cardio:   'Cardio',
  hiit:     'HIIT',
  yoga:     'Yoga',
  running:  'Course',
  other:    'Autre',
};

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const store  = useAppStore();
  const { id } = useLocalSearchParams<{ id: string }>();

  const workout = store.workouts.find(w => w.id === id);

  if (!workout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Séance introuvable</Text>
        </View>
      </View>
    );
  }

  // Volume total de la séance
  const totalVolume = workout.exercises.reduce((sv, ex) =>
    sv + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0);

  // PRs battus dans cette séance (date du PR = date de la séance)
  const workoutPRs = workout.exercises.flatMap(ex => {
    const maxW = Math.max(0, ...ex.sets.map(s => s.weight));
    const pr   = store.prs.find(p => p.exerciseId === ex.exerciseId);
    if (pr && pr.date === workout.date && pr.weight === maxW && maxW > 0) {
      return [{ name: ex.name, weight: pr.weight, reps: pr.reps }];
    }
    return [];
  });

  const dateFormatted = new Date(workout.date + 'T12:00:00')
    .toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const handleDelete = () => {
    Alert.alert(
      'Supprimer cette séance ?',
      `"${workout.name}" sera supprimée définitivement.`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            store.deleteWorkout(workout.id);
            router.back();
          },
        },
      ],
    );
  };

  const handleRepeat = () => {
    router.push({ pathname: '/modals/add-workout', params: { repeatWorkoutId: workout.id } });
  };

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Retour" accessibilityRole="button">
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{workout.name}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Info de la séance ──────────────────────────────────────────── */}
        <View style={styles.infoCard}>
          <Text style={styles.workoutName}>{workout.name}</Text>
          <Text style={styles.workoutDate}>{dateFormatted}</Text>
          <Text style={styles.workoutType}>{TYPE_LABELS[workout.type] ?? workout.type}</Text>
          <View style={styles.statsRow}>
            <StatPill icon="time-outline"    value={`${workout.duration} min`}        color={Colors.primary} />
            <StatPill icon="flame-outline"   value={`${workout.caloriesBurned} kcal`} color={Colors.orange} />
            <StatPill icon="barbell-outline" value={`${Math.round(totalVolume)} kg`}  color={Colors.green} />
          </View>
        </View>

        {/* ── PRs battus ─────────────────────────────────────────────────── */}
        {workoutPRs.length > 0 && (
          <View style={styles.prsCard}>
            <Text style={styles.sectionTitle}>🏆 Records personnels battus</Text>
            {workoutPRs.map((pr, i) => (
              <View key={i} style={styles.prRow}>
                <Text style={styles.prName}>{pr.name}</Text>
                <Text style={styles.prValue}>{pr.weight} kg × {pr.reps} reps</Text>
              </View>
            ))}
          </View>
        )}

        {/* ── Exercices ─────────────────────────────────────────────────── */}
        <View style={styles.exercisesCard}>
          <Text style={styles.sectionTitle}>
            Exercices ({workout.exercises.length})
          </Text>
          {workout.exercises.length === 0 ? (
            <Text style={styles.emptyText}>Aucun exercice enregistré</Text>
          ) : (
            workout.exercises.map((ex, exIdx) => {
              const maxW   = Math.max(0, ...ex.sets.map(s => s.weight));
              const isPR   = workoutPRs.some(p => p.name === ex.name && p.weight === maxW);
              const doneSets = ex.sets.filter(s => s.completed).length;
              return (
                <View key={ex.id} style={[styles.exSection, exIdx > 0 && styles.exSectionBorder]}>
                  <View style={styles.exHeader}>
                    <Text style={styles.exName}>{ex.name}</Text>
                    {isPR && <Text style={styles.prBadge}>🏆 PR</Text>}
                    <Text style={styles.exSetCount}>{doneSets}/{ex.sets.length} séries</Text>
                  </View>
                  {ex.sets.map((set, si) => (
                    <View key={si} style={styles.setRow}>
                      <Text style={styles.setNum}>S{si + 1}</Text>
                      <Text style={styles.setWeight}>
                        {set.weight > 0 ? `${set.weight} kg` : '—'}
                      </Text>
                      <Text style={styles.setReps}>× {set.reps} reps</Text>
                      <Ionicons
                        name={set.completed ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={set.completed ? Colors.green : Colors.textMuted}
                      />
                    </View>
                  ))}
                </View>
              );
            })
          )}
        </View>

        {/* ── Note ──────────────────────────────────────────────────────── */}
        {workout.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Note</Text>
            <Text style={styles.notesText}>{workout.notes}</Text>
          </View>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.repeatBtn} onPress={handleRepeat} accessibilityRole="button">
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.repeatBtnText}>Refaire cette séance</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete} accessibilityRole="button">
          <Ionicons name="trash-outline" size={16} color={Colors.red} />
          <Text style={styles.deleteBtnText}>Supprimer la séance</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ─── Sous-composant ───────────────────────────────────────────────────────────

function StatPill({ icon, value, color }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; value: string; color: string;
}) {
  return (
    <View style={[pillStyles.wrap, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[pillStyles.text, { color }]}>{value}</Text>
    </View>
  );
}
const pillStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: Sp.sm, paddingVertical: 5 },
  text: { fontSize: Fs.xs, fontWeight: Fw.semibold },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  header:      { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { padding: 4 },
  headerTitle: { flex: 1, fontSize: Fs.lg, fontWeight: Fw.bold, color: Colors.text },

  content: { padding: Sp.md, gap: Sp.sm, paddingBottom: 60 },

  infoCard: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, gap: Sp.xs },
  workoutName: { fontSize: Fs.xl, fontWeight: Fw.heavy, color: Colors.text },
  workoutDate: { fontSize: Fs.sm, color: Colors.textSecondary, textTransform: 'capitalize' },
  workoutType: { fontSize: Fs.xs, color: Colors.primary, fontWeight: Fw.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  statsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.xs, marginTop: 4 },

  prsCard: { backgroundColor: Colors.yellow + '10', borderRadius: R, borderWidth: 1, borderColor: Colors.yellow + '30', padding: Sp.md, gap: Sp.xs },
  prRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },
  prName:  { fontSize: Fs.sm, color: Colors.text, flex: 1 },
  prValue: { fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.yellow },

  exercisesCard: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  exSection:     { padding: Sp.md },
  exSectionBorder: { borderTopWidth: 1, borderTopColor: Colors.border },
  exHeader:      { flexDirection: 'row', alignItems: 'center', gap: Sp.xs, marginBottom: Sp.sm },
  exName:        { flex: 1, fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.text },
  prBadge:       { fontSize: Fs.xs, color: Colors.yellow, backgroundColor: Colors.yellow + '15', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  exSetCount:    { fontSize: Fs.xs, color: Colors.textMuted },
  setRow:        { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, paddingVertical: 5, borderTopWidth: 1, borderTopColor: Colors.border },
  setNum:        { fontSize: Fs.xs, color: Colors.textMuted, width: 22 },
  setWeight:     { fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.text, width: 60 },
  setReps:       { flex: 1, fontSize: Fs.sm, color: Colors.textSecondary },
  emptyText:     { fontSize: Fs.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Sp.md },

  notesCard: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, gap: Sp.xs },
  notesText: { fontSize: Fs.sm, color: Colors.textSecondary, lineHeight: 20 },

  sectionTitle: { fontSize: Fs.xs, fontWeight: Fw.bold, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Sp.xs },

  repeatBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: R, paddingVertical: 14 },
  repeatBtnText: { color: '#fff', fontWeight: Fw.bold, fontSize: Fs.md },

  deleteBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: R, borderWidth: 1, borderColor: Colors.red + '40', backgroundColor: Colors.red + '0A' },
  deleteBtnText: { color: Colors.red, fontWeight: Fw.medium, fontSize: Fs.sm },
});
