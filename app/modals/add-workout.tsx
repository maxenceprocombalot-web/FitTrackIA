import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, SectionList, Animated,
  Modal, Dimensions, Share, PanResponder,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import RestTimer from '../../components/ui/RestTimer';
import { useAppStore } from '../../store/useAppStore';
import { WorkoutSession, WorkoutType, ExerciseLog, SetLog } from '../../types';
import {
  EXERCISES, EXERCISE_CATEGORIES, ExerciseTemplate,
  CALORIES_PER_MIN,
} from '../../constants/exercises';
import { PROGRAMS } from '../../constants/programs';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';
import * as storage from '../../services/storage';
import { suggestProgression, ProgressionSuggestion } from '../../services/metrics';
import Button from '../../components/ui/Button';

// ─── Type résumé de séance ────────────────────────────────────────────────────

interface SessionSummary {
  workoutName: string;
  duration: number;
  caloriesBurned: number;
  totalVolume: number;
  prs: { name: string; weight: number; reps: number }[];
}

// ─── Confettis ────────────────────────────────────────────────────────────────

const SCREEN_W       = Dimensions.get('window').width;
const CONF_COUNT     = 18;
const CONF_COLORS    = [Colors.primary, Colors.green, Colors.yellow, Colors.orange, '#b983ff', '#4a9eff'];
// Positions et couleurs fixes pour éviter la recalcul à chaque render
const CONF_PROPS = Array.from({ length: CONF_COUNT }, () => ({
  x:     Math.random() * SCREEN_W,
  color: CONF_COLORS[Math.floor(Math.random() * CONF_COLORS.length)],
  size:  5 + Math.random() * 7,
  delay: Math.floor(Math.random() * 500),
}));

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
  const [summary,      setSummary]      = useState<SessionSummary | null>(null);
  // Flash doré PR : set (exIdx, setIdx) pour l'animation
  const [prFlash, setPrFlash] = useState<string | null>(null);
  const prFlashAnim = useRef(new Animated.Value(0)).current;

  // Mode Focus
  const [showFocus,   setShowFocus]   = useState(false);
  const [focusExIdx,  setFocusExIdx]  = useState(0);
  const [focusSetIdx, setFocusSetIdx] = useState(0);

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

  // ── Surcharge progressive : suggestion par exercice depuis l'historique ──────
  // Clé stable : ne dépend que du nom et des reps planifiées (pas du poids/✓),
  // pour ne pas recalculer à chaque frappe dans les champs de poids.
  const progKey = exercises.map(e => `${e.name}:${e.sets[0]?.reps ?? ''}`).join('|');
  const progressionByName = useMemo(() => {
    const map: Record<string, ProgressionSuggestion> = {};
    exercises.forEach(ex => {
      if (map[ex.name]) return;
      const targetReps = ex.sets[0]?.reps ?? 10;
      const s = suggestProgression(store.workouts, ex.name, { min: targetReps, max: targetReps });
      if (s) map[ex.name] = s;
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progKey, store.workouts]);

  // Applique le poids suggéré aux séries encore vides (poids 0), sans écraser
  // les séries déjà saisies ou validées.
  const applySuggestedWeight = useCallback((exIdx: number, weight: number) => {
    Haptics.selectionAsync();
    setExercises(prev => prev.map((ex, i) =>
      i !== exIdx ? ex : { ...ex, sets: ex.sets.map(s => (s.weight === 0 ? { ...s, weight } : s)) }));
  }, []);

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

    // Volume total soulevé
    const totalVolume = exercises.reduce((sv, ex) =>
      sv + ex.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0);

    // Collecte des PRs battus
    const newPRs: { name: string; weight: number; reps: number }[] = [];
    for (const ex of exercises) {
      const maxWeight = Math.max(0, ...ex.sets.map(s => s.weight));
      const maxReps   = ex.sets.find(s => s.weight === maxWeight)?.reps ?? 0;
      if (maxWeight > 0) {
        const isNewPR = await store.checkAndSavePR(ex.exerciseId, ex.name, maxWeight, maxReps);
        if (isNewPR) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `🏆 Nouveau PR — ${ex.name} !`,
              body: `${maxWeight}kg × ${maxReps} reps — nouveau record personnel !`,
            },
            trigger: null,
          });
          newPRs.push({ name: ex.name, weight: maxWeight, reps: maxReps });
        }
      }
    }

    await store.addWorkout(workout);

    // Affiche le résumé de fin de séance au lieu de router.back() direct
    setSummary({
      workoutName:    workout.name,
      duration:       workout.duration,
      caloriesBurned: workout.caloriesBurned,
      totalVolume,
      prs:            newPRs,
    });
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
    {/* Modal résumé de fin de séance */}
    {summary && (
      <WorkoutSummaryModal
        summary={summary}
        onClose={() => { setSummary(null); router.back(); }}
      />
    )}
    {/* Mode Focus */}
    {showFocus && exercises.length > 0 && (
      <FocusModeModal
        exercises={exercises}
        exIdx={focusExIdx}
        setIdx={focusSetIdx}
        onSetDone={(exIdx, setIdx) => {
          updateSet(exIdx, setIdx, 'completed', true);
          const ex = exercises[exIdx];
          if (setIdx < ex.sets.length - 1) setFocusSetIdx(setIdx + 1);
          else if (exIdx < exercises.length - 1) { setFocusExIdx(exIdx + 1); setFocusSetIdx(0); }
          else { setShowFocus(false); }
        }}
        onNext={() => { if (focusExIdx < exercises.length - 1) { setFocusExIdx(focusExIdx + 1); setFocusSetIdx(0); } }}
        onPrev={() => { if (focusExIdx > 0) { setFocusExIdx(focusExIdx - 1); setFocusSetIdx(0); } }}
        onClose={() => {
          Alert.alert('Quitter le mode Focus ?', 'Ta progression sera conservée.', [
            { text: 'Rester', style: 'cancel' },
            { text: 'Quitter', onPress: () => setShowFocus(false) },
          ]);
        }}
      />
    )}
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
      {/* ── Bouton Mode Focus ────────────────────────────────────────────── */}
      {exercises.length > 0 && (
        <TouchableOpacity style={styles.focusBtn} onPress={() => setShowFocus(true)}>
          <Ionicons name="eye-outline" size={16} color={Colors.orange} />
          <Text style={styles.focusBtnText}>Mode Focus 🎯</Text>
        </TouchableOpacity>
      )}

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
          {/* Surcharge progressive : dernière perf + suggestion appliquable */}
          {(() => {
            const sug = progressionByName[ex.name];
            if (!sug) return null;
            return (
              <TouchableOpacity
                style={styles.progRow}
                activeOpacity={0.7}
                onPress={() => applySuggestedWeight(exIdx, sug.weight)}
                accessibilityRole="button"
                accessibilityLabel={`Dernière fois ${sug.last.weight} kilos pour ${sug.last.reps} répétitions. ${sug.hint}. Toucher pour appliquer ${sug.weight} kilos aux séries non remplies.`}
              >
                <Ionicons
                  name={sug.increased ? 'trending-up' : 'repeat'}
                  size={13}
                  color={sug.increased ? Colors.green : Colors.primary}
                />
                <Text style={styles.progText} numberOfLines={1}>
                  <Text style={styles.progMuted}>
                    Dernière : {sug.last.weight}kg × {sug.last.reps} · </Text>
                  {sug.hint}
                </Text>
                <View style={styles.progApply}>
                  <Text style={styles.progApplyText}>{sug.weight}kg</Text>
                </View>
              </TouchableOpacity>
            );
          })()}
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
      <Button
        title="Enregistrer la séance"
        icon="checkmark-circle-outline"
        onPress={handleSave}
        size="lg"
        style={{ marginTop: Sp.lg }}
      />
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
  // Suggestion de surcharge progressive
  progRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Sp.sm, marginBottom: 6, paddingHorizontal: Sp.sm, paddingVertical: 6, borderRadius: 8, backgroundColor: Colors.primary + '0E', borderWidth: 1, borderColor: Colors.primary + '20' },
  progText: { flex: 1, fontSize: Fs.xs, color: Colors.primary, fontWeight: Fw.medium },
  progMuted: { color: Colors.textMuted, fontWeight: Fw.regular },
  progApply: { backgroundColor: Colors.primary, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  progApplyText: { fontSize: Fs.xs, color: Colors.onPrimary, fontWeight: Fw.bold },
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
  // Mode Focus
  focusBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', paddingHorizontal: Sp.sm, paddingVertical: 6, borderRadius: R, borderWidth: 1, borderColor: Colors.orange + '50', backgroundColor: Colors.orange + '0A', marginBottom: Sp.sm },
  focusBtnText: { fontSize: Fs.xs, color: Colors.orange, fontWeight: Fw.semibold },
});

// ─── Modal résumé de fin de séance ───────────────────────────────────────────

function WorkoutSummaryModal({ summary, onClose }: { summary: SessionSummary; onClose: () => void }) {
  const confettiY       = useRef(CONF_PROPS.map(() => new Animated.Value(-60))).current;
  const confettiOpacity = useRef(CONF_PROPS.map(() => new Animated.Value(0))).current;
  const scaleAnim       = useRef(new Animated.Value(0.8)).current;
  const fadeAnim        = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée de la card
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    // Confettis qui tombent
    const anims = CONF_PROPS.map((cp, i) =>
      Animated.sequence([
        Animated.delay(cp.delay),
        Animated.parallel([
          Animated.timing(confettiY[i],       { toValue: 750, duration: 1600, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(confettiOpacity[i], { toValue: 1, duration: 80,   useNativeDriver: true }),
            Animated.timing(confettiOpacity[i], { toValue: 0, duration: 500,  delay: 1000, useNativeDriver: true }),
          ]),
        ]),
      ])
    );
    Animated.parallel(anims).start();
  }, []);

  const handleShare = () => {
    const lines = [
      `🏋️ Séance : ${summary.workoutName}`,
      `⏱ ${summary.duration} min | 🔥 ${summary.caloriesBurned} kcal | 💪 ${Math.round(summary.totalVolume)} kg volume`,
      summary.prs.length > 0
        ? summary.prs.map(pr => `🏆 PR ${pr.name} : ${pr.weight}kg × ${pr.reps}`).join('\n')
        : '',
      '— FitTrackIA',
    ].filter(Boolean).join('\n');
    Share.share({ message: lines });
  };

  return (
    <Modal visible transparent animationType="none">
      <Animated.View style={[smStyles.overlay, { opacity: fadeAnim }]}>
        {/* Confettis */}
        {CONF_PROPS.map((cp, i) => (
          <Animated.View
            key={i}
            style={[
              smStyles.confetti,
              {
                left:            cp.x,
                width:           cp.size,
                height:          cp.size,
                borderRadius:    cp.size / 2,
                backgroundColor: cp.color,
                opacity:         confettiOpacity[i],
                transform:       [{ translateY: confettiY[i] }],
              },
            ]}
          />
        ))}

        {/* Card centrale */}
        <Animated.View style={[smStyles.card, { transform: [{ scale: scaleAnim }] }]}>
          <Text style={smStyles.emoji}>🎉</Text>
          <Text style={smStyles.title}>Séance terminée !</Text>
          <Text style={smStyles.name}>{summary.workoutName}</Text>

          {/* Stats */}
          <View style={smStyles.statsRow}>
            <SummaryPill icon="time-outline"    value={`${summary.duration} min`}      color={Colors.primary} />
            <SummaryPill icon="flame-outline"   value={`${summary.caloriesBurned} kcal`} color={Colors.orange} />
            <SummaryPill icon="barbell-outline" value={`${Math.round(summary.totalVolume)} kg`} color={Colors.green} />
          </View>

          {/* PRs */}
          {summary.prs.length > 0 && (
            <View style={smStyles.prsBox}>
              <Text style={smStyles.prsTitle}>🏆 Nouveaux records !</Text>
              {summary.prs.map((pr, i) => (
                <View key={i} style={smStyles.prRow}>
                  <Text style={smStyles.prName}>{pr.name}</Text>
                  <Text style={smStyles.prVal}>{pr.weight} kg × {pr.reps}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Boutons */}
          <View style={smStyles.btns}>
            <TouchableOpacity style={smStyles.shareBtn} onPress={handleShare}>
              <Ionicons name="share-outline" size={16} color={Colors.primary} />
              <Text style={smStyles.shareBtnText}>Partager</Text>
            </TouchableOpacity>
            <TouchableOpacity style={smStyles.continueBtn} onPress={onClose}>
              <Text style={smStyles.continueBtnText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function SummaryPill({ icon, value, color }: { icon: React.ComponentProps<typeof Ionicons>['name']; value: string; color: string }) {
  return (
    <View style={[smStyles.pill, { backgroundColor: color + '18' }]}>
      <Ionicons name={icon} size={13} color={color} />
      <Text style={[smStyles.pillText, { color }]}>{value}</Text>
    </View>
  );
}

const smStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', alignItems: 'center', justifyContent: 'center' },
  confetti:    { position: 'absolute', top: 0 },
  card: {
    width: '88%', backgroundColor: Colors.surface,
    borderRadius: 24, borderWidth: 1, borderColor: Colors.border,
    padding: Sp.lg, alignItems: 'center', gap: Sp.sm,
  },
  emoji:       { fontSize: 52 },
  title:       { fontSize: Fs.xxl, fontWeight: Fw.heavy, color: Colors.text },
  name:        { fontSize: Fs.sm, color: Colors.textSecondary, marginTop: -4 },
  statsRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.xs, justifyContent: 'center', marginTop: 4 },
  pill:        { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 99, paddingHorizontal: Sp.sm, paddingVertical: 6 },
  pillText:    { fontSize: Fs.xs, fontWeight: Fw.semibold },
  prsBox:      { width: '100%', backgroundColor: Colors.yellow + '10', borderRadius: R, borderWidth: 1, borderColor: Colors.yellow + '30', padding: Sp.sm, gap: 4 },
  prsTitle:    { fontSize: Fs.sm, fontWeight: Fw.bold, color: Colors.yellow, marginBottom: 2 },
  prRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prName:      { fontSize: Fs.xs, color: Colors.text, flex: 1 },
  prVal:       { fontSize: Fs.xs, fontWeight: Fw.semibold, color: Colors.yellow },
  btns:        { flexDirection: 'row', gap: Sp.sm, width: '100%', marginTop: 4 },
  shareBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: Sp.sm, paddingHorizontal: Sp.lg, borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '50' },
  shareBtnText:{ fontSize: Fs.sm, color: Colors.primary, fontWeight: Fw.medium },
  continueBtn: { flex: 1, backgroundColor: Colors.primary, borderRadius: R, paddingVertical: Sp.sm, alignItems: 'center', justifyContent: 'center' },
  continueBtnText: { fontSize: Fs.md, fontWeight: Fw.bold, color: Colors.onPrimary },
});

// ─── Mode Focus ───────────────────────────────────────────────────────────────

function FocusModeModal({ exercises, exIdx, setIdx, onSetDone, onNext, onPrev, onClose }: {
  exercises: ExerciseLog[];
  exIdx: number;
  setIdx: number;
  onSetDone: (e: number, s: number) => void;
  onNext: () => void;
  onPrev: () => void;
  onClose: () => void;
}) {
  const ex = exercises[exIdx];
  const set = ex?.sets[setIdx];
  const [restSecs, setRestSecs] = useState(0);
  const [resting, setResting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const panX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (resting) {
      intervalRef.current = setInterval(() => setRestSecs(s => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setResting(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          return 0;
        }
        return s - 1;
      }), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [resting]);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 30 && Math.abs(g.dy) < 40,
    onPanResponderRelease: (_, g) => {
      if (g.dx < -80) onNext();
      else if (g.dx > 80) onPrev();
      Animated.spring(panX, { toValue: 0, useNativeDriver: true }).start();
    },
    onPanResponderMove: (_, g) => panX.setValue(g.dx * 0.3),
  })).current;

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <View style={focusStyles.bg} {...panResponder.panHandlers}>
        {/* Header */}
        <View style={focusStyles.header}>
          <Text style={focusStyles.progress}>{exIdx + 1} / {exercises.length}</Text>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={26} color="rgba(255,255,255,0.5)" /></TouchableOpacity>
        </View>

        {/* Exercice en grand */}
        <Animated.View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', transform: [{ translateX: panX }] }}>
          <Text style={focusStyles.exName}>{ex?.name}</Text>
          <Text style={focusStyles.setInfo}>Série {setIdx + 1} / {ex?.sets.length}</Text>
          {set && (
            <View style={focusStyles.setDetail}>
              {set.weight > 0 && <Text style={focusStyles.setVal}>{set.weight} kg</Text>}
              <Text style={focusStyles.setVal}>{set.reps} reps</Text>
            </View>
          )}
        </Animated.View>

        {/* Timer de repos ou bouton */}
        {resting ? (
          <View style={focusStyles.restBox}>
            <Text style={focusStyles.restTitle}>Repos</Text>
            <Text style={focusStyles.restTimer}>{restSecs}s</Text>
            <TouchableOpacity style={focusStyles.skipRestBtn} onPress={() => { setResting(false); setRestSecs(0); }}>
              <Text style={focusStyles.skipRestText}>Passer →</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={focusStyles.doneBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onSetDone(exIdx, setIdx);
              setRestSecs(90);
              setResting(true);
            }}
            activeOpacity={0.85}
          >
            <Text style={focusStyles.doneBtnText}>Série complète ✓</Text>
          </TouchableOpacity>
        )}

        {/* Navigation */}
        <View style={focusStyles.navRow}>
          <TouchableOpacity onPress={onPrev} disabled={exIdx === 0} style={[focusStyles.navBtn, exIdx === 0 && { opacity: 0.3 }]}>
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={focusStyles.swipeHint}>← Swipe pour changer d'exercice →</Text>
          <TouchableOpacity onPress={onNext} disabled={exIdx === exercises.length - 1} style={[focusStyles.navBtn, exIdx === exercises.length - 1 && { opacity: 0.3 }]}>
            <Ionicons name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const focusStyles = StyleSheet.create({
  bg:          { flex: 1, backgroundColor: '#050508', paddingHorizontal: Sp.lg },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 60, paddingBottom: Sp.lg },
  progress:    { fontSize: Fs.sm, color: 'rgba(255,255,255,0.4)', fontWeight: Fw.medium },
  exName:      { fontSize: 36, fontWeight: Fw.heavy, color: '#fff', textAlign: 'center', lineHeight: 44 },
  setInfo:     { fontSize: Fs.xl, color: Colors.primary, marginTop: Sp.md, fontWeight: Fw.semibold },
  setDetail:   { flexDirection: 'row', gap: Sp.xl, marginTop: Sp.lg },
  setVal:      { fontSize: 52, fontWeight: Fw.heavy, color: Colors.orange },
  restBox:     { alignItems: 'center', paddingBottom: 40 },
  restTitle:   { fontSize: Fs.md, color: 'rgba(255,255,255,0.5)', marginBottom: 4 },
  restTimer:   { fontSize: 72, fontWeight: Fw.heavy, color: Colors.primary },
  skipRestBtn: { marginTop: Sp.md, paddingHorizontal: Sp.lg, paddingVertical: 10, borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '50' },
  skipRestText:{ color: Colors.primary, fontWeight: Fw.semibold },
  doneBtn:     { marginBottom: 50, backgroundColor: Colors.green, borderRadius: 24, paddingVertical: 24, marginHorizontal: Sp.md, alignItems: 'center', shadowColor: Colors.green, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
  doneBtnText: { fontSize: 26, fontWeight: Fw.heavy, color: '#fff', letterSpacing: 0.5 },
  navRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 50, paddingHorizontal: Sp.md },
  navBtn:      { padding: 12 },
  swipeHint:   { fontSize: Fs.xs, color: 'rgba(255,255,255,0.2)' },
});
