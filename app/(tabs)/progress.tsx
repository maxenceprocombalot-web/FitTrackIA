import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput,
  TouchableOpacity, StyleSheet, Dimensions, Animated,
  Share, Image, Modal, Alert,
} from 'react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import Svg, { Path, Circle, Line, Rect, Text as SvgText } from 'react-native-svg';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { WeightEntry, SavedPlan, BodyMeasurement, WeeklyChallenge } from '../../types';
import Card from '../../components/ui/Card';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';
import { shareFooter } from '../../constants/app';
import Button from '../../components/ui/Button';
import WeightField from '../../components/ui/WeightField';
import * as ImagePicker from 'expo-image-picker';
// API legacy : documentDirectory/copyAsync (SDK 54 a déplacé l'API moderne vers Paths)
import * as FileSystem from 'expo-file-system/legacy';
import {
  loadProgressPhotos, saveProgressPhoto, deleteProgressPhoto,
  loadMeasurements, saveMeasurement,
  loadChallenges, saveChallenges,
} from '../../services/storage';
import { today, thisMonth, daysAgo, localISO , fmtDayMonth } from '../../services/date';
import { projectWeight } from '../../services/metrics';
import { BADGES } from '../../constants/badges';
import { WeightChart, CaloriesChart, ExerciseChart } from '../../components/progress/Charts';
import { ExoStat, ScoreRow, WBadge, BigStat } from '../../components/progress/Stats';
import { getUnlockedBadges, getDefaultChallenges, getChallengeProgress } from '../../services/badges';


type Period  = '30j' | '90j' | 'tout';
type ActiveTab = 'mesures' | 'sport' | 'nutrition' | 'recompenses';
// 4 groupes au lieu de 10 onglets : chaque groupe concatène les anciennes sections


export default function ProgressScreen() {
  const store  = useAppStore(['user', 'workouts', 'meals', 'weights', 'water', 'prs', 'savedPlans', 'loading']);
  const router = useRouter();
  const [period,        setPeriod]        = useState<Period>('30j');
  const [activeTab,     setActiveTab]     = useState<ActiveTab>('mesures');
  const [selectedExo,   setSelectedExo]   = useState<string | null>(null);

  // Photos de progression
  const [photos, setPhotos] = useState<{ id: string; uri: string; date: string }[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  // Les photos sont des images : les monter toutes d'un coup consomme beaucoup
  // de mémoire. On n'affiche que les plus récentes, avec un bouton pour voir tout.
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const PHOTOS_VISIBLE = 12;
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);

  useEffect(() => {
    loadProgressPhotos().then(setPhotos);
  }, []);

  // Mensurations
  const [measurements, setMeasurements] = useState<BodyMeasurement[]>([]);
  const [measWaist, setMeasWaist] = useState('');
  const [measArm,   setMeasArm]   = useState('');
  const [measThigh, setMeasThigh] = useState('');
  const [measChest, setMeasChest] = useState('');

  // Défis hebdomadaires
  const [challenges, setChallenges] = useState<WeeklyChallenge[]>([]);
  const currentWeekKey = useMemo(() => {
    const d = new Date();
    const day = d.getDay() === 0 ? 7 : d.getDay();
    d.setDate(d.getDate() - day + 1);
    return localISO(d);
  }, []);

  useEffect(() => {
    (async () => {
      let saved = await loadChallenges(currentWeekKey);
      if (saved.length === 0) {
        saved = getDefaultChallenges(currentWeekKey, store.user);
        await saveChallenges(currentWeekKey, saved);
      }
      setChallenges(saved);
    })();
  }, [currentWeekKey, store.user]);

  // Score de forme hebdomadaire
  const fitnessScore = useMemo(() => {
    const since7 = daysAgo(7);

    const weekWorkouts = store.workouts.filter(w => w.date >= since7).length;
    const sportPts = Math.min((weekWorkouts / 3) * 40, 40);

    const target = store.user?.targetCalories ?? 2000;
    const dayCalMap: Record<string, number> = {};
    store.meals.filter(m => m.date >= since7).forEach(m => {
      const cal = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
      dayCalMap[m.date] = (dayCalMap[m.date] ?? 0) + cal;
    });
    const daysInRange = Object.values(dayCalMap).filter(v => v >= target * 0.9 && v <= target * 1.1).length;
    const nutritionPts = (daysInRange / 7) * 40;

    const waterGoal = store.user?.waterGoalMl ?? 2000;
    const hydroPts = Math.min((store.water.ml / waterGoal) * 10, 10);

    const tw = store.user?.targetWeight;
    const lw = store.weights[store.weights.length - 1]?.weight;
    const iw = store.user?.weight;
    let weightPts = 0;
    if (tw && lw && iw && Math.abs(tw - iw) > 0.1) {
      const progress = Math.abs(lw - iw) / Math.abs(tw - iw);
      weightPts = Math.min(progress * 10, 10);
    }

    return Math.round(sportPts + nutritionPts + hydroPts + weightPts);
  }, [store.workouts, store.meals, store.water, store.weights, store.user]);

  const prevScore = useMemo(() => {
    const s14 = daysAgo(14);
    const s7  = daysAgo(7);
    const pw = store.workouts.filter(w => w.date >= s14 && w.date < s7).length;
    const sportP = Math.min((pw / 3) * 40, 40);
    const target = store.user?.targetCalories ?? 2000;
    const dcm: Record<string, number> = {};
    store.meals.filter(m => m.date >= s14 && m.date < s7).forEach(m => {
      const c = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
      dcm[m.date] = (dcm[m.date] ?? 0) + c;
    });
    const dir = Object.values(dcm).filter(v => v >= target * 0.9 && v <= target * 1.1).length;
    return Math.round(sportP + (dir / 7) * 40);
  }, [store.workouts, store.meals, store.user]);

  // Animation CountUp du score
  const scoreAnim = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);
  useEffect(() => {
    Animated.timing(scoreAnim, { toValue: fitnessScore, duration: 800, useNativeDriver: false }).start();
    const id = scoreAnim.addListener(({ value }) => setDisplayScore(Math.round(value)));
    return () => scoreAnim.removeListener(id);
  }, [fitnessScore]);

  const scoreColor = fitnessScore < 40 ? Colors.red : fitnessScore < 70 ? Colors.orange : Colors.green;
  const scoreLabel = fitnessScore < 40 ? 'À améliorer 💡' : fitnessScore < 70 ? 'Bien 👍' : 'Excellent 💪';
  const scoreDiff = fitnessScore - prevScore;

  useEffect(() => {
    loadMeasurements().then(setMeasurements);
  }, []);

  // Volume musculaire 7 jours
  const muscleVolume = useMemo(() => {
    const since = daysAgo(7);
    const vol: Record<string, number> = {};
    store.workouts.filter(w => w.date >= since).forEach(w => {
      w.exercises.forEach(ex => {
        if (ex.category && ex.category !== 'Cardio') {
          vol[ex.category] = (vol[ex.category] ?? 0) + ex.sets.length;
        }
      });
    });
    return vol;
  }, [store.workouts]);

  // ── Historique par exercice (pour le graphique) ───────────────────────────
  const exerciseHistory = useMemo(() => {
    const map: Record<string, { date: string; maxWeight: number }[]> = {};
    store.workouts.forEach(w => {
      w.exercises.forEach(ex => {
        const maxW = Math.max(0, ...ex.sets.map(s => s.weight));
        if (maxW <= 0) return;
        if (!map[ex.name]) map[ex.name] = [];
        const existing = map[ex.name].find(e => e.date === w.date);
        if (!existing)           map[ex.name].push({ date: w.date, maxWeight: maxW });
        else if (maxW > existing.maxWeight) existing.maxWeight = maxW;
      });
    });
    return map;
  }, [store.workouts]);

  const exerciseNames = Object.keys(exerciseHistory).sort();

  const exoData = useMemo(() => {
    const name = selectedExo ?? exerciseNames[0];
    if (!name) return [];
    const since = daysAgo(30);
    return (exerciseHistory[name] ?? [])
      .filter(e => e.date >= since)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [selectedExo, exerciseHistory, exerciseNames]);

  const effectiveExo   = selectedExo ?? exerciseNames[0] ?? null;
  const exoSessions    = effectiveExo ? (exerciseHistory[effectiveExo]?.length ?? 0) : 0;
  const exoBestWeight  = exoData.length > 0 ? Math.max(...exoData.map(d => d.maxWeight)) : 0;
  const exoFirstWeight = exoData.length > 0 ? exoData[0].maxWeight : 0;
  const exoProgression = exoBestWeight - exoFirstWeight;

  const filteredWeights = (() => {
    const days   = period === '30j' ? 30 : period === '90j' ? 90 : 9999;
    const since  = daysAgo(days);
    return store.weights.filter(w => w.date >= since);
  })();

  const latest = store.weights[store.weights.length - 1];
  const first  = store.weights[0];

  // Objectif : poids cible explicite, sinon dérivé de l'objectif général.
  const projTarget = store.user?.targetWeight
    ?? (store.user
        ? (store.user.goal === 'weight_loss'  ? Math.round(store.user.weight * 0.9)
         : store.user.goal === 'muscle_gain' ? Math.round(store.user.weight * 1.05)
         : undefined)
        : undefined);
  const weightProj = projectWeight(filteredWeights, projTarget);

  const totalWorkouts  = store.workouts.length;
  const totalVolume    = store.workouts.reduce((s, w) =>
    s + w.exercises.reduce((sv, e) =>
      sv + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0);
  const exerciseCount: Record<string, number> = {};
  store.workouts.forEach(w => w.exercises.forEach(e => {
    exerciseCount[e.name] = (exerciseCount[e.name] ?? 0) + 1;
  }));
  const topExercise = Object.entries(exerciseCount).sort((a, b) => b[1] - a[1])[0];

  const last7 = (() => {
    const since = daysAgo(7);
    const dayMap: Record<string, number> = {};
    store.meals
      .filter(m => m.date >= since)
      .forEach(m => {
        const cal = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
        dayMap[m.date] = (dayMap[m.date] ?? 0) + cal;
      });
    const vals = Object.values(dayMap);
    const avg  = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0;
    const target   = store.user?.targetCalories ?? 2000;
    const inRange  = vals.filter(v => v >= target * 0.9 && v <= target * 1.1).length;
    return { avg, daysTracked: vals.length, daysInRange: inRange };
  })();


  const calories30 = useMemo(() => {
    const since = daysAgo(30);
    const dayMap: Record<string, number> = {};
    store.meals.filter(m => m.date >= since).forEach(m => {
      const cal = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
      dayMap[m.date] = (dayMap[m.date] ?? 0) + cal;
    });
    return Object.entries(dayMap)
      .map(([date, calories]) => ({ date, calories: Math.round(calories) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [store.meals]);

  const calTarget  = store.user?.targetCalories ?? 2000;
  const calAvg     = calories30.length ? Math.round(calories30.reduce((s, e) => s + e.calories, 0) / calories30.length) : 0;
  const calInRange = calories30.filter(e => e.calories >= calTarget * 0.9 && e.calories <= calTarget * 1.1).length;
  const calBestDay = calories30.reduce<{ date: string; calories: number } | null>(
    (best, e) => (!best || Math.abs(e.calories - calTarget) < Math.abs(best.calories - calTarget)) ? e : best,
    null,
  );


  const TAB_LABELS: Record<ActiveTab, string> = {
    mesures: '📏 Mesures',
    sport: '💪 Sport',
    nutrition: '🥗 Nutrition',
    recompenses: '🏆 Récompenses',
  };

  return (
    <AnimatedScreen style={{ flex: 1 }}>
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Carte Score de forme ──────────────────────────────────────────── */}
      <Card>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={styles.sectionLabel}>Score de forme</Text>
            <Text style={{ fontSize: 56, fontFamily: Fonts.heavy, color: scoreColor, lineHeight: 64 }}>{displayScore}</Text>
            <Text style={{ fontSize: Fs.sm, color: scoreColor, fontFamily: Fonts.semibold }}>{scoreLabel}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: Sp.xs }}>
            <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted }}>/100</Text>
            {scoreDiff !== 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: (scoreDiff > 0 ? Colors.green : Colors.red) + '18', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 }}>
                <Ionicons name={scoreDiff > 0 ? 'trending-up' : 'trending-down'} size={12} color={scoreDiff > 0 ? Colors.green : Colors.red} />
                <Text style={{ fontSize: Fs.xs, color: scoreDiff > 0 ? Colors.green : Colors.red, fontFamily: Fonts.semibold }}>{scoreDiff > 0 ? '+' : ''}{scoreDiff} vs sem. préc.</Text>
              </View>
            )}
            <View style={{ gap: 4 }}>
              <ScoreRow label="Sport" pts={Math.round(Math.min((store.workouts.filter(w => w.date >= daysAgo(7)).length / 3) * 40, 40))} max={40} color={Colors.primary} />
              <ScoreRow label="Nutrition" pts={Math.round((Object.values((() => { const dm: Record<string,number> = {}; const c7 = daysAgo(7); store.meals.filter(m=>m.date>=c7).forEach(m=>{ const c=m.items.reduce((s,i)=>s+i.caloriesPer100g*i.quantity/100,0); dm[m.date]=(dm[m.date]??0)+c; }); return dm; })()).filter(v=>v>=(store.user?.targetCalories??2000)*0.9&&v<=(store.user?.targetCalories??2000)*1.1).length / 7) * 40)} max={40} color={Colors.green} />
              <ScoreRow label="Eau" pts={Math.round(Math.min((store.water.ml/(store.user?.waterGoalMl??2000))*10,10))} max={10} color={Colors.blue} />
            </View>
          </View>
        </View>
      </Card>

      {/* ── Onglets ──────────────────────────────────────────────────────── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabsScroll} contentContainerStyle={styles.tabsContent}>
        {(['mesures', 'sport', 'nutrition', 'recompenses'] as ActiveTab[]).map(tab => (
          <TouchableOpacity accessibilityRole="button"
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {TAB_LABELS[tab]}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ── Onglet Poids ─────────────────────────────────────────────────── */}
      {activeTab === 'mesures' && (
        <>
          <Card>
            <Text style={styles.sectionLabel}>Poids du jour</Text>
            <WeightField initial={latest?.weight} onSave={w => store.addWeight({ date: today(), weight: w })} />
            <View style={styles.weightSummary}>
              <WBadge label="Actuel"    value={latest ? `${latest.weight} kg` : '—'} color={Colors.text} />
              <WBadge label="Départ"    value={first  ? `${first.weight} kg`  : '—'} color={Colors.textSecondary} />
              {latest && first && (
                <WBadge
                  label="Évolution"
                  value={`${latest.weight > first.weight ? '+' : ''}${(latest.weight - first.weight).toFixed(1)} kg`}
                  color={latest.weight <= first.weight ? Colors.green : Colors.orange}
                />
              )}
            </View>
          </Card>
          <View style={styles.periodRow}>
            {(['30j', '90j', 'tout'] as Period[]).map(p => (
              <TouchableOpacity accessibilityRole="button"
                key={p}
                style={[styles.periodBtn, period === p && styles.periodBtnActive]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Card style={styles.chartCard}>
            <Text style={styles.sectionLabel}>Courbe de poids ({filteredWeights.length} pesées)</Text>
            <WeightChart entries={filteredWeights} />
          </Card>
          {weightProj && (
            <Card style={styles.projCard}>
              <Ionicons
                name={weightProj.slopePerWeek < -0.01 ? 'trending-down' : weightProj.slopePerWeek > 0.01 ? 'trending-up' : 'remove-outline'}
                size={18}
                color={Colors.primary}
              />
              <View style={{ flex: 1 }}>
                <Text style={styles.projText}>
                  Tendance : <Text style={{ color: Colors.primary, fontFamily: Fonts.bold }}>
                    {weightProj.slopePerWeek > 0 ? '+' : ''}{weightProj.slopePerWeek} kg/semaine
                  </Text>
                </Text>
                {weightProj.etaDate ? (
                  <Text style={styles.projSub}>
                    🎯 Objectif {weightProj.target} kg atteint vers le{' '}
                    <Text style={{ color: Colors.text, fontFamily: Fonts.semibold }}>
                      {new Date(weightProj.etaDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </Text>.
                  </Text>
                ) : weightProj.target !== undefined && !weightProj.onTrack && Math.abs(weightProj.slopePerWeek) > 0.01 ? (
                  <Text style={styles.projSub}>Ta tendance ne va pas vers ton objectif de {weightProj.target} kg — ajuste nutrition/activité.</Text>
                ) : null}
              </View>
            </Card>
          )}
          {store.weights.length > 0 && (
            <Card>
              <Text style={styles.sectionLabel}>Historique</Text>
              {[...store.weights].reverse().slice(0, 15).map(e => (
                <View key={e.date} style={styles.histRow}>
                  <Text style={styles.histDate}>{new Date(e.date).toLocaleDateString('fr-FR')}</Text>
                  <Text style={styles.histVal}>{e.weight} kg</Text>
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ── Onglet Sport ─────────────────────────────────────────────────── */}
      {activeTab === 'sport' && (
        <>
          {(store.streak.current > 0 || store.streak.best > 0) && (
            <Card style={styles.streakCard}>
              <View style={styles.streakRow}>
                <Text style={styles.streakEmoji}>🔥</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.streakTitle}>Streak actuel : {store.streak.current} jour{store.streak.current > 1 ? 's' : ''}</Text>
                  <Text style={styles.streakSub}>Meilleur : {store.streak.best} jour{store.streak.best > 1 ? 's' : ''}</Text>
                </View>
              </View>
            </Card>
          )}

          <View style={styles.statGrid}>
            <BigStat value={String(totalWorkouts)} label="Total séances"   color={Colors.primary} />
            <BigStat value={`${Math.round(totalVolume / 1000)} t`} label="Volume total" color={Colors.green} />
          </View>
          {topExercise && (
            <Card>
              <Text style={styles.sectionLabel}>Exercice favori</Text>
              <Text style={styles.bigExercise}>{topExercise[0]}</Text>
              <Text style={styles.bigExerciseSub}>{topExercise[1]} séries au total</Text>
            </Card>
          )}
          <Card>
            <View style={styles.prHeader}>
              <Text style={styles.sectionLabel}>Records personnels 🏆</Text>
              <Text style={styles.prCount}>{store.prs.length} record{store.prs.length > 1 ? 's' : ''}</Text>
            </View>
            {store.prs.length === 0 && (
              <Text style={styles.emptyText}>Aucun PR enregistré — commence à t'entraîner !</Text>
            )}
            {[...store.prs]
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(pr => {
                const gain = pr.previousWeight ? pr.weight - pr.previousWeight : null;
                return (
                  <View key={pr.exerciseId} style={styles.prRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.prName}>{pr.exerciseName}</Text>
                      <Text style={styles.prDate}>{new Date(pr.date).toLocaleDateString('fr-FR')}</Text>
                    </View>
                    <View style={styles.prRight}>
                      <Text style={styles.prWeight}>{pr.weight} kg × {pr.reps}</Text>
                      {gain !== null && gain > 0 && (
                        <Text style={styles.prGain}>+{gain.toFixed(1)} kg</Text>
                      )}
                    </View>
                  </View>
                );
              })}
          </Card>
          {exerciseNames.length > 0 && (
            <Card>
              <Text style={styles.sectionLabel}>Progression par exercice</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exoScroll} contentContainerStyle={styles.exoScrollContent}>
                {exerciseNames.map(name => (
                  <TouchableOpacity accessibilityRole="button"
                    key={name}
                    style={[styles.exoChip, (effectiveExo === name) && styles.exoChipActive]}
                    onPress={() => setSelectedExo(name)}
                  >
                    <Text style={[styles.exoChipText, (effectiveExo === name) && styles.exoChipTextActive]} numberOfLines={1}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {effectiveExo && (
                <View style={styles.exoStats}>
                  <ExoStat label="Meilleur" value={`${exoBestWeight} kg`} color={Colors.yellow} />
                  <ExoStat
                    label="Progression"
                    value={exoProgression >= 0 ? `+${exoProgression.toFixed(1)} kg` : `${exoProgression.toFixed(1)} kg`}
                    color={exoProgression >= 0 ? Colors.green : Colors.red}
                  />
                  <ExoStat label="Séances" value={String(exoSessions)} color={Colors.primary} />
                </View>
              )}

              <ExerciseChart data={exoData} />
            </Card>
          )}
        </>
      )}

      {/* ── Onglet Nutrition ─────────────────────────────────────────────── */}
      {activeTab === 'nutrition' && (
        <>
          <View style={styles.statGrid}>
            <BigStat value={`${last7.avg}`} label="Moy. kcal/j (7j)"   color={Colors.caloriesColor} />
            <BigStat value={`${last7.daysTracked}j`} label="Jours trackés"  color={Colors.primary} />
          </View>
          <Card>
            <Text style={styles.sectionLabel}>Jours dans la cible (±10%)</Text>
            <View style={styles.inRangeBar}>
              <View style={[styles.inRangeFill, { width: `${last7.daysTracked > 0 ? (last7.daysInRange / last7.daysTracked) * 100 : 0}%` }]} />
            </View>
            <Text style={styles.inRangeText}>
              {last7.daysInRange}/{last7.daysTracked} jours dans la fenêtre calorique
            </Text>
          </Card>
        </>
      )}

      {/* ── Onglet Calories ──────────────────────────────────────────────── */}
      {activeTab === 'nutrition' && (
        <>
          <View style={styles.statGrid}>
            <BigStat value={String(calAvg)}     label={`moy. 30j (obj: ${calTarget})`} color={calAvg > calTarget ? Colors.red : Colors.green} />
            <BigStat value={String(calInRange)}  label="jours dans l'objectif (±10%)"  color={Colors.primary} />
          </View>
          {calBestDay && (
            <Card>
              <Text style={styles.sectionLabel}>Meilleur jour</Text>
              <Text style={{ color: Colors.text, fontSize: Fs.md, fontFamily: Fonts.semibold }}>
                {new Date(calBestDay.date + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </Text>
              <Text style={{ color: Colors.textSecondary, fontSize: Fs.xs, fontFamily: Fonts.regular, marginTop: 2 }}>
                {calBestDay.calories} kcal — plus proche de l'objectif
              </Text>
            </Card>
          )}
          <Card style={styles.chartCard}>
            <Text style={styles.sectionLabel}>Évolution sur 30 jours</Text>
            <View style={styles.calLegend}>
              <View style={styles.calLegendItem}>
                <View style={[styles.calLegendDot, { backgroundColor: Colors.green }]} />
                <Text style={styles.calLegendText}>Sous l'objectif</Text>
              </View>
              <View style={styles.calLegendItem}>
                <View style={[styles.calLegendDot, { backgroundColor: Colors.red }]} />
                <Text style={styles.calLegendText}>Au-dessus</Text>
              </View>
              <View style={styles.calLegendItem}>
                <View style={[styles.calLegendDash, { borderColor: Colors.primary }]} />
                <Text style={styles.calLegendText}>Objectif</Text>
              </View>
            </View>
            <CaloriesChart entries={calories30} target={calTarget} />
          </Card>
        </>
      )}

      {/* ── Onglet Muscles ───────────────────────────────────────────────── */}
      {activeTab === 'sport' && (
        <>
          <Card>
            <Text style={styles.sectionLabel}>Volume musculaire – 7 derniers jours</Text>
            <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: Sp.md }}>
              Volume recommandé : 10–20 séries/semaine par muscle
            </Text>
            {['Pectoraux','Dos','Épaules','Bras','Jambes','Abdos'].map(muscle => {
              const sets = muscleVolume[muscle] ?? 0;
              const color = sets === 0 ? Colors.textMuted : sets < 10 ? Colors.orange : sets <= 20 ? Colors.green : Colors.red;
              const label = sets === 0 ? 'Non travaillé' : sets < 10 ? 'Insuffisant' : sets <= 20 ? 'Optimal' : 'Surentraîné';
              const barWidth = Math.min((sets / 25) * 100, 100);
              return (
                <View key={muscle} style={{ marginBottom: Sp.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: Fs.sm, color: Colors.text, fontFamily: Fonts.medium }}>{muscle}</Text>
                    <Text style={{ fontSize: Fs.xs, color, fontFamily: Fonts.semibold }}>{sets} séries · {label}</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${barWidth}%`, backgroundColor: color, borderRadius: 4 }} />
                  </View>
                </View>
              );
            })}
          </Card>
          {Object.keys(muscleVolume).length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Ionicons name="barbell-outline" size={48} color={Colors.textMuted} />
              <Text style={{ color: Colors.textSecondary, marginTop: 12, fontSize: Fs.md, fontFamily: Fonts.regular }}>Aucune séance cette semaine</Text>
            </View>
          )}
        </>
      )}

      {/* ── Onglet Corps ─────────────────────────────────────────────────── */}
      {activeTab === 'mesures' && (
        <>
          {store.user && (() => {
            const w = store.weights[store.weights.length - 1]?.weight ?? store.user.weight;
            const h = store.user.height / 100;
            const imc = w / (h * h);
            const cat = imc < 18.5 ? 'Insuffisance pondérale' : imc < 25 ? 'Poids normal' : imc < 30 ? 'Surpoids' : 'Obésité';
            const color = imc < 18.5 ? Colors.orange : imc < 25 ? Colors.green : imc < 30 ? Colors.orange : Colors.red;
            return (
              <Card>
                <Text style={styles.sectionLabel}>IMC</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 40, fontFamily: Fonts.heavy, color }}>{imc.toFixed(1)}</Text>
                  <Text style={{ fontSize: Fs.md, color, fontFamily: Fonts.semibold }}>{cat}</Text>
                </View>
                <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 4 }}>{w} kg · {store.user.height} cm</Text>
              </Card>
            );
          })()}

          <Card>
            <Text style={styles.sectionLabel}>Saisir les mensurations du jour</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Sp.sm }}>
              {[
                { label: 'Taille (cm)', value: measWaist, setter: setMeasWaist },
                { label: 'Bras (cm)',   value: measArm,   setter: setMeasArm },
                { label: 'Cuisse (cm)', value: measThigh, setter: setMeasThigh },
                { label: 'Poitrine (cm)', value: measChest, setter: setMeasChest },
              ].map(field => (
                <View key={field.label} style={{ width: '48%' }}>
                  <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginBottom: 3 }}>{field.label}</Text>
                  <TextInput
                    style={styles.weightInput}
                    value={field.value}
                    onChangeText={field.setter}
                    keyboardType="decimal-pad"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              ))}
            </View>
            <Button
              title="Enregistrer"
              style={{ marginTop: Sp.sm }}
              onPress={async () => {
                const m: BodyMeasurement = {
                  date:  today(),
                  waist: measWaist  ? parseFloat(measWaist)  : undefined,
                  arm:   measArm    ? parseFloat(measArm)    : undefined,
                  thigh: measThigh  ? parseFloat(measThigh)  : undefined,
                  chest: measChest  ? parseFloat(measChest)  : undefined,
                };
                await saveMeasurement(m);
                setMeasurements(prev => {
                  const idx = prev.findIndex(x => x.date === m.date);
                  return idx >= 0 ? prev.map((x, i) => i === idx ? m : x) : [...prev, m].sort((a, b) => a.date.localeCompare(b.date));
                });
                setMeasWaist(''); setMeasArm(''); setMeasThigh(''); setMeasChest('');
              }}
            />
          </Card>

          {measurements.length > 0 && (
            <Card>
              <Text style={styles.sectionLabel}>Historique</Text>
              <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 6, marginBottom: 6 }}>
                {['Date','Taille','Bras','Cuisse','Poitrine'].map(h => (
                  <Text key={h} style={{ flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center' }}>{h}</Text>
                ))}
              </View>
              {[...measurements].reverse().slice(0, 10).map(m => (
                <View key={m.date} style={{ flexDirection: 'row', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                  <Text style={{ flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center' }}>{fmtDayMonth(m.date)}</Text>
                  {[m.waist, m.arm, m.thigh, m.chest].map((v, i) => (
                    <Text key={i} style={{ flex: 1, fontSize: Fs.xs, fontFamily: v ? Fonts.semibold : Fonts.regular, color: v ? Colors.text : Colors.textMuted, textAlign: 'center' }}>
                      {v ? `${v}` : '—'}
                    </Text>
                  ))}
                </View>
              ))}
            </Card>
          )}
        </>
      )}

      {/* ── Onglet Badges ────────────────────────────────────────────────── */}
      {activeTab === 'recompenses' && (() => {
        const unlocked = getUnlockedBadges(store);
        const count = unlocked.size;
        return (
          <>
            <Card>
              <Text style={styles.sectionLabel}>Badges débloqués : {count} / {BADGES.length}</Text>
              <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                <View style={{ height: '100%', width: `${(count / BADGES.length) * 100}%`, backgroundColor: Colors.yellow, borderRadius: 3 }} />
              </View>
            </Card>
            <View style={styles.badgesGrid}>
              {BADGES.map(badge => {
                const isUnlocked = unlocked.has(badge.id);
                return (
                  <View key={badge.id} style={[styles.badgeCard, !isUnlocked && styles.badgeCardLocked]}>
                    <Text style={[styles.badgeEmoji, !isUnlocked && styles.badgeEmojiLocked]}>{badge.emoji}</Text>
                    <Text style={[styles.badgeTitle, !isUnlocked && styles.badgeTitleLocked]} numberOfLines={1}>{badge.title}</Text>
                    <Text style={styles.badgeDesc} numberOfLines={2}>{badge.description}</Text>
                    {!isUnlocked && <Ionicons name="lock-closed" size={12} color={Colors.textMuted} style={{ marginTop: 2 }} />}
                  </View>
                );
              })}
            </View>
          </>
        );
      })()}

      {/* ── Onglet Photos ────────────────────────────────────────────────── */}
      {activeTab === 'mesures' && (
        <>
          <TouchableOpacity accessibilityRole="button" style={styles.addPhotoBtn} onPress={async () => {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission refusée', 'Active l\'accès à la photothèque dans les réglages.'); return; }
            const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              const destDir = FileSystem.documentDirectory + 'progress_photos/';
              await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
              const filename = `photo_${Date.now()}.jpg`;
              await FileSystem.copyAsync({ from: asset.uri, to: destDir + filename });
              const photo = { id: filename, uri: destDir + filename, date: today() };
              await saveProgressPhoto(photo);
              setPhotos(prev => [...prev, photo]);
            }
          }}>
            <Ionicons name="camera-outline" size={18} color={Colors.primary} />
            <Text style={styles.addPhotoBtnText}>📸 Ajouter une photo</Text>
          </TouchableOpacity>

          {selectedPhotos.length === 2 && (
            <TouchableOpacity accessibilityRole="button" style={styles.beforeAfterBtn} onPress={() => setShowBeforeAfter(true)}>
              <Text style={styles.beforeAfterBtnText}>Voir Before / After</Text>
            </TouchableOpacity>
          )}

          {photos.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 50 }}>
              <Text style={{ fontSize: 48, fontFamily: Fonts.regular }}>📸</Text>
              <Text style={{ color: Colors.textSecondary, marginTop: 12, fontSize: Fs.md, fontFamily: Fonts.regular }}>Aucune photo</Text>
              <Text style={{ color: Colors.textMuted, fontSize: Fs.sm, fontFamily: Fonts.regular, textAlign: 'center', marginTop: 6 }}>
                Ajoute des photos pour suivre ta transformation
              </Text>
            </View>
          ) : (
            <View style={styles.photosGrid}>
              {(showAllPhotos ? photos : photos.slice(-PHOTOS_VISIBLE)).map(photo => {
                const isSelected = selectedPhotos.includes(photo.id);
                return (
                  <TouchableOpacity accessibilityRole="button"
                    key={photo.id}
                    style={[styles.photoThumb, isSelected && styles.photoThumbSelected]}
                    onPress={() => {
                      setSelectedPhotos(prev =>
                        prev.includes(photo.id)
                          ? prev.filter(id => id !== photo.id)
                          : prev.length < 2 ? [...prev, photo.id] : [prev[1], photo.id]
                      );
                    }}
                    onLongPress={() => Alert.alert('Supprimer', 'Supprimer cette photo ?', [
                      { text: 'Annuler', style: 'cancel' },
                      { text: 'Supprimer', style: 'destructive', onPress: async () => {
                          await FileSystem.deleteAsync(photo.uri, { idempotent: true });
                          await deleteProgressPhoto(photo.id);
                          setPhotos(prev => prev.filter(p => p.id !== photo.id));
                          setSelectedPhotos(prev => prev.filter(id => id !== photo.id));
                        }
                      },
                    ])}
                  >
                    <Image source={{ uri: photo.uri }} style={styles.photoImg} />
                    {isSelected && (
                      <View style={styles.photoCheckOverlay}>
                        <Ionicons name="checkmark-circle" size={24} color={Colors.primary} />
                      </View>
                    )}
                    <Text style={styles.photoDate}>{fmtDayMonth(photo.date)}</Text>
                  </TouchableOpacity>
                );
              })}
            
              {!showAllPhotos && photos.length > PHOTOS_VISIBLE && (
                <TouchableOpacity
                  style={styles.morePhotosBtn}
                  onPress={() => setShowAllPhotos(true)}
                  accessibilityRole="button"
                >
                  <Text style={styles.morePhotosText}>+{photos.length - PHOTOS_VISIBLE}</Text>
                  <Text style={styles.morePhotosSub}>voir tout</Text>
                </TouchableOpacity>
              )}
</View>
          )}

          {showBeforeAfter && selectedPhotos.length === 2 && (() => {
            const p1 = photos.find(p => p.id === selectedPhotos[0]);
            const p2 = photos.find(p => p.id === selectedPhotos[1]);
            return p1 && p2 ? (
              <Modal visible animationType="fade" onRequestClose={() => setShowBeforeAfter(false)}>
                <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center' }}>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel="Fermer la comparaison" onPress={() => setShowBeforeAfter(false)} style={{ position: 'absolute', top: 50, right: 20, zIndex: 10 }}>
                    <Ionicons name="close" size={28} color="#fff" />
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontFamily: Fonts.bold, marginBottom: 4 }}>Avant · {fmtDayMonth(p1.date)}</Text>
                      <Image source={{ uri: p1.uri }} style={{ width: '95%', height: 400, borderRadius: 8 }} resizeMode="cover" />
                    </View>
                    <View style={{ flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontFamily: Fonts.bold, marginBottom: 4 }}>Après · {fmtDayMonth(p2.date)}</Text>
                      <Image source={{ uri: p2.uri }} style={{ width: '95%', height: 400, borderRadius: 8 }} resizeMode="cover" />
                    </View>
                  </View>
                  <TouchableOpacity accessibilityRole="button"
                    style={{ margin: 20, backgroundColor: Colors.primary, borderRadius: R, padding: 14, alignItems: 'center' }}
                    onPress={() => Share.share({ message: `Ma transformation : de ${p1.date} à ${p2.date} 💪` + shareFooter() })}
                  >
                    <Text style={{ color: '#fff', fontFamily: Fonts.bold }}>Partager</Text>
                  </TouchableOpacity>
                </View>
              </Modal>
            ) : null;
          })()}
        </>
      )}

      {/* ── Onglet Défis ─────────────────────────────────────────────────── */}
      {activeTab === 'recompenses' && (
        <>
          <Card>
            <Text style={styles.sectionLabel}>Défis de la semaine</Text>
            <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginBottom: Sp.sm }}>
              {new Date(currentWeekKey).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} → {new Date(new Date(currentWeekKey).getTime() + 6*86400000).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
            </Text>
            {challenges.map(ch => {
              const progress = getChallengeProgress(ch, currentWeekKey, store);
              const pct = Math.min(progress / ch.target, 1);
              const done = pct >= 1;
              return (
                <View key={ch.id} style={{ marginBottom: Sp.md, backgroundColor: Colors.surfaceElevated, borderRadius: R, borderWidth: 1, borderColor: done ? Colors.green + '50' : Colors.border, padding: Sp.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sp.sm, marginBottom: Sp.sm }}>
                    <Text style={{ fontSize: 24 }}>{ch.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: Fs.md, fontFamily: Fonts.semibold, color: done ? Colors.green : Colors.text }}>{ch.title}</Text>
                      <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 }}>{ch.description}</Text>
                    </View>
                    {done && <Ionicons name="checkmark-circle" size={22} color={Colors.green} />}
                  </View>
                  <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: '100%', width: `${pct * 100}%`, backgroundColor: done ? Colors.green : Colors.primary, borderRadius: 3 }} />
                  </View>
                  <Text style={{ fontSize: Fs.xs, fontFamily: done ? Fonts.semibold : Fonts.regular, color: done ? Colors.green : Colors.textSecondary, marginTop: 4 }}>
                    {progress} / {ch.target} {done ? '— Défi relevé ! 🎉' : ''}
                  </Text>
                </View>
              );
            })}
          </Card>
        </>
      )}

      {/* ── Rapport mensuel (visible depuis tous les onglets) ─────────────── */}
      <TouchableOpacity accessibilityRole="button"
        style={styles.reportBtn}
        onPress={() => {
          const month = new Date().toLocaleString('fr-FR', { month: 'long', year: 'numeric' });
          const totalVol = store.workouts.reduce((sv, w) => sv + w.exercises.reduce((se, e) => se + e.sets.reduce((ss, s) => ss + s.reps * s.weight, 0), 0), 0);
          const latestWeight = store.weights[store.weights.length - 1]?.weight;
          const unlockedBadgesCount = getUnlockedBadges(store).size;
          const thisMonthKey = thisMonth();
          const monthWorkouts = store.workouts.filter(w => w.date.startsWith(thisMonthKey));
          const dayCalMap: Record<string, number> = {};
          store.meals.filter(m => m.date.startsWith(thisMonthKey)).forEach(m => {
            const cal = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
            dayCalMap[m.date] = (dayCalMap[m.date] ?? 0) + cal;
          });
          const calVals = Object.values(dayCalMap);
          const avgCal  = calVals.length ? Math.round(calVals.reduce((a, b) => a + b, 0) / calVals.length) : 0;
          const newPRs  = store.prs.filter(p => p.date.startsWith(thisMonthKey));

          const report = `📊 RAPPORT MENSUEL FITTRACK IA
${month.toUpperCase()}
${'─'.repeat(30)}

⚖️ POIDS
• Poids actuel : ${latestWeight ? `${latestWeight} kg` : 'Non renseigné'}

🏋️ SPORT
• Séances réalisées : ${monthWorkouts.length}
• Volume total : ${Math.round(totalVol)} kg
• PRs battus ce mois : ${newPRs.length}
${newPRs.map(pr => `  - ${pr.exerciseName} : ${pr.weight} kg × ${pr.reps}`).join('\n')}

🍽️ NUTRITION
• Calories moyennes : ${avgCal} kcal/j
• Objectif : ${store.user?.targetCalories ?? '?'} kcal/j

🏅 BADGES
• Badges débloqués : ${unlockedBadgesCount} / ${BADGES.length}

${'─'.repeat(30)}
Généré par FitTrack IA · ${new Date().toLocaleDateString('fr-FR')}`;

          Share.share({ message: report, title: `Rapport FitTrack IA - ${month}` });
        }}
      >
        <Ionicons name="document-text-outline" size={16} color={Colors.primary} />
        <Text style={styles.reportBtnText}>📄 Générer mon rapport mensuel</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
    </AnimatedScreen>
  );
}

// ─── Graphique progression exercice ──────────────────────────────────────────



const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, gap: Sp.sm, paddingBottom: 40 },
  tabsScroll: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border },
  tabsContent: { padding: 4, gap: 3 },
  tab: { paddingVertical: 8, paddingHorizontal: Sp.sm, borderRadius: R - 2, alignItems: 'center', minWidth: 70 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { fontSize: Fs.xs, color: Colors.textSecondary, fontFamily: Fonts.medium },
  tabTextActive: { color: '#fff', fontFamily: Fonts.semibold },
  // Légende calories
  calLegend:     { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.sm, marginBottom: Sp.sm },
  calLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  calLegendDot:  { width: 8, height: 8, borderRadius: 4 },
  calLegendDash: { width: 16, height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  calLegendText: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  sectionLabel: { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Sp.sm },
  weightInputRow: { flexDirection: 'row', gap: Sp.sm, marginBottom: Sp.md },
  weightInput: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: 10, fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.text, borderWidth: 1, borderColor: Colors.border },
  weightSummary: { flexDirection: 'row' },
  periodRow: { flexDirection: 'row', gap: Sp.xs },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
  periodBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  periodText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  periodTextActive: { color: Colors.primary, fontFamily: Fonts.semibold },
  chartCard: { overflow: 'hidden' },
  projCard: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 19 },
  projSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 17, marginTop: 3 },
  histRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  histDate: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  histVal: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text },
  statGrid: { flexDirection: 'row', gap: Sp.sm },
  bigExercise: { fontSize: Fs.xl, fontFamily: Fonts.bold, color: Colors.text },
  bigExerciseSub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 2 },
  prHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Sp.sm },
  prCount: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  prRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border, gap: 8 },
  prName: { fontSize: Fs.sm, fontFamily: Fonts.medium, color: Colors.text },
  prRight: { alignItems: 'flex-end', gap: 2 },
  prWeight: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.yellow },
  prGain: { fontSize: Fs.xs, color: Colors.green, fontFamily: Fonts.semibold },
  prDate: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  emptyText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', paddingVertical: Sp.md },
  inRangeBar: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 6 },
  inRangeFill: { height: '100%', backgroundColor: Colors.green, borderRadius: 99 },
  inRangeText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  streakCard: { borderColor: Colors.orange + '40', backgroundColor: Colors.orange + '08' },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  streakEmoji: { fontSize: 28 },
  streakTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text },
  streakSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  exoScroll:        { marginHorizontal: -Sp.md },
  exoScrollContent: { paddingHorizontal: Sp.md, paddingVertical: 6, gap: 6 },
  exoChip:          { paddingHorizontal: Sp.sm, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated, maxWidth: 150 },
  exoChipActive:    { borderColor: Colors.yellow, backgroundColor: Colors.yellow + '18' },
  exoChipText:      { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  exoChipTextActive:{ color: Colors.yellow, fontFamily: Fonts.semibold },
  exoStats:         { flexDirection: 'row', gap: Sp.xs, marginBottom: 4 },
  plansFilterRow: { flexDirection: 'row', gap: Sp.xs },
  plansFilterBtn: { flex: 1, paddingVertical: 8, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, alignItems: 'center' },
  plansFilterBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  plansFilterText: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  plansFilterTextActive: { color: Colors.primary, fontFamily: Fonts.semibold },
  plansCount: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  plansEmpty: { alignItems: 'center', paddingVertical: 50, gap: 8 },
  plansEmptyText: { fontSize: Fs.md, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  plansEmptySub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', paddingHorizontal: Sp.lg },
  // Badges
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.sm },
  badgeCard: { width: '30%', backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.yellow + '40', padding: Sp.sm, alignItems: 'center', gap: 3 },
  badgeCardLocked: { borderColor: Colors.border, opacity: 0.5 },
  badgeEmoji: { fontSize: 28 },
  badgeEmojiLocked: { opacity: 0.4 },
  badgeTitle: { fontSize: Fs.xs, fontFamily: Fonts.bold, color: Colors.text, textAlign: 'center' },
  badgeTitleLocked: { color: Colors.textMuted },
  badgeDesc: { fontSize: 9, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', lineHeight: 12 },
  // Photos
  addPhotoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary + '18', borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '40', paddingVertical: 14, marginBottom: Sp.sm },
  addPhotoBtnText: { fontSize: Fs.md, color: Colors.primary, fontFamily: Fonts.semibold },
  beforeAfterBtn: { backgroundColor: Colors.green, borderRadius: R, paddingVertical: 12, alignItems: 'center', marginBottom: Sp.sm },
  beforeAfterBtnText: { color: Colors.onPrimary, fontFamily: Fonts.bold, fontSize: Fs.sm },
  morePhotosBtn:  { width: 96, height: 96, borderRadius: R, borderWidth: 1, borderColor: Colors.borderStrong, backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  morePhotosText: { fontSize: Fs.lg, fontFamily: Fonts.condensedBold, color: Colors.primary },
  morePhotosSub:  { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.xs },
  photoThumb: { width: '31.5%', aspectRatio: 1, borderRadius: R, overflow: 'hidden', position: 'relative' },
  photoThumbSelected: { borderWidth: 2, borderColor: Colors.primary },
  photoImg: { width: '100%', height: '100%' },
  photoCheckOverlay: { position: 'absolute', top: 4, right: 4 },
  photoDate: { position: 'absolute', bottom: 4, left: 4, color: '#fff', fontSize: Fs.xs, fontFamily: Fonts.semibold, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  // Rapport mensuel
  reportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary + '15', borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '35', paddingVertical: 14, marginTop: Sp.sm },
  reportBtnText: { fontSize: Fs.sm, color: Colors.primary, fontFamily: Fonts.semibold },
});
