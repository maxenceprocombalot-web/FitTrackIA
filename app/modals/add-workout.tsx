import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, SectionList, Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import RestTimer from '../../components/ui/RestTimer';
import { useAppStore } from '../../store/useAppStore';
import { WorkoutSession, WorkoutType, ExerciseLog, SetLog } from '../../types';
import {
  EXERCISES, EXERCISE_CATEGORIES, ExerciseCategory, ExerciseTemplate,
  CALORIES_PER_MIN,
} from '../../constants/exercises';
import { PROGRAMS } from '../../constants/programs';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';
import * as storage from '../../services/storage';

const TYPE_OPTIONS: { value: WorkoutType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'strength', label: 'Muscu',    icon: 'barbell-outline' },
  { value: 'cardio',   label: 'Cardio',   icon: 'bicycle-outline' },
  { value: 'hiit',     label: 'HIIT',     icon: 'flash-outline' },
  { value: 'yoga',     label: 'Yoga',     icon: 'body-outline' },
  { value: 'running',  label: 'Course',   icon: 'walk-outline' },
  { value: 'other',    label: 'Autre',    icon: 'fitness-outline' },
];

export default function AddWorkoutModal() {
  const router  = useRouter();
  const store   = useAppStore();
  const params  = useLocalSearchParams<{ programId?: string; sessionId?: string; presetName?: string; repeatWorkoutId?: string }>();

  const [name,      setName]      = useState(params.presetName ?? '');
  const [type,      setType]      = useState<WorkoutType>('strength');
  const [duration,  setDuration]  = useState('');
  const [exercises, setExercises] = useState<ExerciseLog[]>([]);
  const [notes,     setNotes]     = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [searchEx,  setSearchEx]  = useState('');

  // Pré-remplissage : répétition de la dernière séance
  useEffect(() => {
    if (params.repeatWorkoutId) {
      const last = store.workouts.find(w => w.id === params.repeatWorkoutId);
      if (last) {
        setName(last.name);
        setType(last.type);
        setDuration(String(last.duration));
        // Recopie exercices avec sets remis à zéro (completed: false)
        setExercises(last.exercises.map((ex, i) => ({
          ...ex,
          id: `repeat_${i}_${Date.now()}`,
          sets: ex.sets.map(s => ({ ...s, completed: false })),
        })));
        return; // Ne pas appliquer le pré-remplissage programme ensuite
      }
    }
    // Pré-remplissage depuis un programme
    if (!params.programId || !params.sessionId) return;
    const prog    = PROGRAMS.find(p => p.id === params.programId);
    const session = prog?.sessions.find(s => s.id === params.sessionId);
    if (!session) return;
    const presetExercises: ExerciseLog[] = session.exercises.map((ex, i) => ({
      id: `preset_${i}`,
      exerciseId: `preset_${i}`,
      name: ex.name,
      category: 'Autre',
      sets: Array.from({ length: ex.sets }, () => ({
        reps: parseInt(ex.reps) || 10,
        weight: 0,
        completed: false,
      })),
    }));
    setExercises(presetExercises);
    // Durée estimée depuis le programme
    if (prog && !duration) setDuration(String(prog.sessionDuration));
  }, []);

  const [timerVisible, setTimerVisible] = useState(false);
  // Flash doré PR : set (exIdx, setIdx) pour l'animation
  const [prFlash, setPrFlash] = useState<string | null>(null);
  const prFlashAnim = useRef(new Animated.Value(0)).current;

  const triggerPRFlash = useCallback((key: string) => {
    setPrFlash(key);
    prFlashAnim.setValue(0);
    Animated.sequence([
      Animated.timing(prFlashAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(prFlashAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start(() => setPrFlash(null));
  }, []);

  const estimatedCal = duration
    ? Math.round(parseInt(duration) * (CALORIES_PER_MIN[type] ?? 5))
    : 0;

  // Sections pour le picker d'exercices
  const exerciseSections = useMemo(() => {
    const filtered = EXERCISES.filter(e =>
      !searchEx.trim() || e.name.toLowerCase().includes(searchEx.toLowerCase())
    );
    return EXERCISE_CATEGORIES
      .map(cat => ({ title: cat, data: filtered.filter(e => e.category === cat) }))
      .filter(s => s.data.length > 0);
  }, [searchEx]);

  const addExercise = (tpl: ExerciseTemplate) => {
    const log: ExerciseLog = {
      id: `${tpl.id}_${Date.now()}`,
      exerciseId: tpl.id,
      name: tpl.name,
      category: tpl.category,
      sets: Array.from({ length: tpl.defaultSets }, () => ({
        reps: tpl.defaultReps,
        weight: 0,
        completed: false,
      })),
    };
    setExercises(prev => [...prev, log]);
    setShowPicker(false);
  };

  const updateSet = useCallback(async (exIdx: number, setIdx: number, field: keyof SetLog, value: string | boolean | number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      return {
        ...ex,
        sets: ex.sets.map((s, j) => j !== setIdx ? s : { ...s, [field]: value }),
      };
    }));

    // Détection PR en temps réel sur le poids
    if (field === 'weight' && typeof value === 'number' && value > 0) {
      const ex   = exercises[exIdx];
      if (!ex) return;
      const pr   = store.prs.find(p => p.exerciseId === ex.exerciseId);
      if (!pr || value > pr.weight) {
        const key = `${exIdx}_${setIdx}`;
        triggerPRFlash(key);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    }

    // Timer de repos auto quand une série est validée
    if (field === 'completed' && value === true) {
      setTimerVisible(true);
    }
  }, [exercises, store.prs, triggerPRFlash]);

  const addSet = (exIdx: number) => {
    setExercises(prev => prev.map((ex, i) => {
      if (i !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return { ...ex, sets: [...ex.sets, { ...last, completed: false }] };
    }));
  };

  const removeExercise = (exIdx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Erreur', 'Donne un nom à ta séance.'); return; }
    if (!duration || parseInt(duration) <= 0) { Alert.alert('Erreur', 'Indique la durée.'); return; }

    const workout: WorkoutSession = {
      id: Date.now().toString(),
      date: storage.today(),
      name: name.trim(),
      type,
      duration: parseInt(duration),
      caloriesBurned: estimatedCal,
      exercises,
      notes: notes.trim() || undefined,
    };

    // Vérification et notification des PRs à la fin de la séance
    for (const ex of exercises) {
      const maxWeight = Math.max(0, ...ex.sets.map(s => s.weight));
      const maxReps   = ex.sets.find(s => s.weight === maxWeight)?.reps ?? 0;
      if (maxWeight > 0) {
        const isNewPR = await store.checkAndSavePR(ex.exerciseId, ex.name, maxWeight, maxReps);
        if (isNewPR) {
          // Haptic de succès
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Notification push immédiate
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🏆 Nouveau PR — ${ex.name} !`,
              body: `${maxWeight}kg × ${maxReps} reps — nouveau record personnel !`,
            },
            trigger: null, // immédiat
          });
        }
      }
    }

    await store.addWorkout(workout);
    router.back();
  };

  if (showPicker) {
    return (
      <View style={styles.container}>
        <View style={styles.pickerHeader}>
          <TextInput
            style={styles.searchInput}
            value={searchEx}
            onChangeText={setSearchEx}
            placeholder="Rechercher un exercice…"
            placeholderTextColor={Colors.textMuted}
            autoFocus
          />
          <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>
        <SectionList
          sections={exerciseSections}
          keyExtractor={item => item.id}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.exercisePickerRow} onPress={() => addExercise(item)}>
              <Text style={styles.exercisePickerName}>{item.name}</Text>
              <Text style={styles.exercisePickerMeta}>{item.defaultSets} × {item.defaultReps}</Text>
              <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          )}
          stickySectionHeadersEnabled
        />
      </View>
    );
  }

  return (
    <>
    <RestTimer visible={timerVisible} onClose={() => setTimerVisible(false)} />
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* ── Nom ─────────────────────────────────────────────────────────── */}
      <Label text="Nom de la séance" />
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Push Day, Cardio matin…"
        placeholderTextColor={Colors.textMuted}
        autoFocus
      />

      {/* ── Type ────────────────────────────────────────────────────────── */}
      <Label text="Type" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeScroll} contentContainerStyle={styles.typeContent}>
        {TYPE_OPTIONS.map(t => (
          <TouchableOpacity
            key={t.value}
            style={[styles.typeBtn, type === t.value && styles.typeBtnActive]}
            onPress={() => setType(t.value)}
          >
            <Ionicons name={t.icon} size={18} color={type === t.value ? Colors.primary : Colors.textSecondary} />
            <Text style={[styles.typeBtnText, type === t.value && styles.typeBtnTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Durée ───────────────────────────────────────────────────────── */}
      <Label text="Durée (minutes)" />
      <View style={styles.durationRow}>
        <TextInput
          style={[styles.input, { flex: 1, marginBottom: 0 }]}
          value={duration}
          onChangeText={setDuration}
          placeholder="45"
          placeholderTextColor={Colors.textMuted}
          keyboardType="number-pad"
        />
        {estimatedCal > 0 && (
          <View style={styles.calBadge}>
            <Ionicons name="flame-outline" size={14} color={Colors.orange} />
            <Text style={styles.calBadgeText}>~{estimatedCal} kcal</Text>
          </View>
        )}
      </View>

      {/* ── Exercices ───────────────────────────────────────────────────── */}
      <View style={styles.exHeader}>
        <Label text={`Exercices (${exercises.length})`} />
        <TouchableOpacity style={styles.addExBtn} onPress={() => setShowPicker(true)}>
          <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
          <Text style={styles.addExBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {exercises.map((ex, exIdx) => (
        <View key={ex.id} style={styles.exerciseCard}>
          <View style={styles.exerciseCardHeader}>
            <Text style={styles.exerciseName}>{ex.name}</Text>
            <TouchableOpacity onPress={() => removeExercise(exIdx)}>
              <Ionicons name="close-circle" size={18} color={Colors.red} />
            </TouchableOpacity>
          </View>
          {/* En-têtes colonnes */}
          <View style={styles.setHeaderRow}>
            <Text style={[styles.setHeaderText, { width: 28 }]}>Set</Text>
            <Text style={[styles.setHeaderText, { flex: 1 }]}>Reps</Text>
            <Text style={[styles.setHeaderText, { flex: 1 }]}>Poids (kg)</Text>
            <Text style={[styles.setHeaderText, { width: 28 }]}>✓</Text>
          </View>
          {ex.sets.map((set, setIdx) => (
            <View key={setIdx} style={styles.setRow}>
              <Text style={[styles.setNum, { width: 28 }]}>{setIdx + 1}</Text>
              <TextInput
                style={[styles.setInput, { flex: 1 }]}
                value={String(set.reps)}
                onChangeText={v => updateSet(exIdx, setIdx, 'reps', parseInt(v) || 0)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TextInput
                style={[styles.setInput, { flex: 1 }]}
                value={set.weight === 0 ? '' : String(set.weight)}
                onChangeText={v => updateSet(exIdx, setIdx, 'weight', parseFloat(v) || 0)}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                selectTextOnFocus
              />
              {/* Badge PR flash doré */}
              {prFlash === `${exIdx}_${setIdx}` && (
                <Animated.View style={[styles.prFlash, { opacity: prFlashAnim }]}>
                  <Text style={styles.prFlashText}>🏆</Text>
                </Animated.View>
              )}
              <TouchableOpacity
                style={[styles.checkBtn, set.completed && styles.checkBtnDone]}
                onPress={() => updateSet(exIdx, setIdx, 'completed', !set.completed)}
              >
                <Ionicons name={set.completed ? 'checkmark' : 'ellipse-outline'} size={16} color={set.completed ? '#fff' : Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          {/* Bouton repos manuel */}
          <View style={styles.setFooter}>
            <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exIdx)}>
              <Ionicons name="add" size={14} color={Colors.primary} />
              <Text style={styles.addSetBtnText}>Série</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.restBtn} onPress={() => setTimerVisible(true)}>
              <Ionicons name="timer-outline" size={14} color={Colors.orange} />
              <Text style={styles.restBtnText}>Repos</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* ── Notes ───────────────────────────────────────────────────────── */}
      <Label text="Notes (optionnel)" />
      <TextInput
        style={[styles.input, styles.textarea]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Ressenti, progression, remarques…"
        placeholderTextColor={Colors.textMuted}
        multiline
        numberOfLines={3}
      />

      {/* ── Bouton sauvegarder ──────────────────────────────────────────── */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Ionicons name="checkmark-circle-outline" size={22} color="#fff" />
        <Text style={styles.saveBtnText}>Enregistrer la séance</Text>
      </TouchableOpacity>
    </ScrollView>
    </>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, paddingBottom: Sp.xxl, gap: 4 },
  label: { fontSize: Fs.xs, fontWeight: Fw.semibold, color: Colors.textSecondary, marginTop: Sp.md, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: Colors.surface, borderRadius: R, padding: Sp.md, fontSize: Fs.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border, marginBottom: 4 },
  textarea: { height: 80, textAlignVertical: 'top' },
  typeScroll: { marginHorizontal: -Sp.md },
  typeContent: { paddingHorizontal: Sp.md, gap: Sp.xs },
  typeBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: Sp.md, paddingVertical: 8, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  typeBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  typeBtnText: { fontSize: Fs.sm, color: Colors.textSecondary },
  typeBtnTextActive: { color: Colors.primary, fontWeight: Fw.semibold },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  calBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.orange + '18', borderRadius: R, paddingHorizontal: Sp.sm, paddingVertical: 10 },
  calBadgeText: { fontSize: Fs.sm, color: Colors.orange, fontWeight: Fw.semibold },
  exHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExBtnText: { fontSize: Fs.sm, color: Colors.primary, fontWeight: Fw.medium },
  exerciseCard: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 4 },
  exerciseCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Sp.sm + 4 },
  exerciseName: { flex: 1, fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.text },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Sp.sm, paddingBottom: 4 },
  setHeaderText: { fontSize: Fs.xs, color: Colors.textMuted, textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Sp.sm, paddingVertical: 5, gap: 6, borderTopWidth: 1, borderTopColor: Colors.border },
  setNum: { fontSize: Fs.xs, color: Colors.textMuted, textAlign: 'center' },
  setInput: { backgroundColor: Colors.surfaceElevated, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: Fs.sm, color: Colors.text, textAlign: 'center', borderWidth: 1, borderColor: Colors.border },
  checkBtn: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  checkBtnDone: { backgroundColor: Colors.green, borderColor: Colors.green },
  setFooter: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: Colors.border },
  addSetBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, padding: Sp.sm, justifyContent: 'center' },
  addSetBtnText: { fontSize: Fs.xs, color: Colors.primary },
  restBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4, padding: Sp.sm, justifyContent: 'center', borderLeftWidth: 1, borderLeftColor: Colors.border },
  restBtnText: { fontSize: Fs.xs, color: Colors.orange },
  // Flash PR doré
  prFlash: { position: 'absolute', right: 28, top: 0, bottom: 0, justifyContent: 'center' },
  prFlashText: { fontSize: 18 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Sp.sm, backgroundColor: Colors.primary, borderRadius: R, padding: Sp.md, marginTop: Sp.lg },
  saveBtnText: { color: '#fff', fontSize: Fs.md, fontWeight: Fw.bold },
  // Picker d'exercices
  pickerHeader: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  searchInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: 10, fontSize: Fs.md, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  closeBtn: { padding: 6 },
  sectionHeader: { backgroundColor: Colors.bg, paddingHorizontal: Sp.md, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: Colors.border },
  sectionHeaderText: { fontSize: Fs.xs, fontWeight: Fw.bold, color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.5 },
  exercisePickerRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Sp.md, paddingVertical: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border, gap: Sp.sm },
  exercisePickerName: { flex: 1, fontSize: Fs.md, color: Colors.text },
  exercisePickerMeta: { fontSize: Fs.xs, color: Colors.textMuted },
});
