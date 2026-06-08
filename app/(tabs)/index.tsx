import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Animated, RefreshControl,
} from 'react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import AnimatedRing from '../../components/ui/AnimatedRing';
import MacroBar from '../../components/ui/MacroBar';
import Card from '../../components/ui/Card';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';
import * as storage from '../../services/storage';
import { generateMonthlyMessage } from '../../services/openai';
import { MonthlySummary } from '../../types';

// Message coach déterministe basé sur les données
function coachMessage(name: string, consumed: number, goal: number, burned: number, sessions: number): string {
  const net = consumed - burned;
  const rem = goal - net;
  if (sessions >= 1 && rem > 0) return `Bravo ${name} ! 💪 Tu t'es entraîné aujourd'hui. Il te reste ${Math.round(rem)} kcal — recharge bien en protéines et glucides.`;
  if (rem < 0) return `Attention ${name}, tu as dépassé ton objectif de ${Math.abs(Math.round(rem))} kcal. C'est ok ponctuellement — essaie de rester dans ta fenêtre demain.`;
  if (consumed === 0) return `Bonjour ${name} ! 🌅 Commence par enregistrer ton premier repas pour que je puisse suivre ta progression.`;
  return `Bien joué ${name} 🎯 — il te reste ${Math.round(rem)} kcal. Continue à ce rythme !`;
}

// Régression linéaire pour projection de poids
function weightProjection(weights: { date: string; weight: number }[], targetWeight: number): number | null {
  const last14 = weights.slice(-14);
  if (last14.length < 3) return null;
  const ys  = last14.map(w => w.weight);
  const n   = ys.length;
  const xs  = Array.from({ length: n }, (_, i) => i);
  const sX  = xs.reduce((a, b) => a + b, 0);
  const sY  = ys.reduce((a, b) => a + b, 0);
  const sXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sX2 = xs.reduce((a, x) => a + x * x, 0);
  const slope = (n * sXY - sX * sY) / (n * sX2 - sX * sX);
  if (Math.abs(slope) < 0.001) return null;
  const days = Math.round((targetWeight - ys[ys.length - 1]) / slope);
  return days > 0 && days < 730 ? days : null;
}

export default function DashboardScreen() {
  const router  = useRouter();
  const store   = useAppStore();
  const user    = store.user;

  useEffect(() => {
    if (!store.loading && !user) router.replace('/modals/onboarding');
  }, [store.loading, user]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => { setRefreshing(true); await store.refresh(); setRefreshing(false); };

  // ── Bilan mensuel automatique ──────────────────────────────────────────────
  const bilanGenerated = useRef(false);

  const generateMonthlyBilan = useCallback(async () => {
    if (!user || bilanGenerated.current) return;

    const today    = new Date();
    if (today.getDate() !== 1) return; // Uniquement le 1er du mois

    // Mois précédent : YYYY-MM
    const lastMonth    = new Date(today.getFullYear(), today.getMonth() - 1);
    const lastMonthKey = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    // Vérifier si déjà généré/vu ce mois-ci
    const existing = store.monthlySummaries.find(s => s.month === lastMonthKey);
    if (existing?.viewedAt) return;

    bilanGenerated.current = true;

    // Calculer les stats du mois précédent
    const lastMonthWorkouts = store.workouts.filter(w => w.date.startsWith(lastMonthKey));
    const lastMonthMeals    = store.meals.filter(m => m.date.startsWith(lastMonthKey));
    const monthWeights      = store.weights.filter(w => w.date.startsWith(lastMonthKey));

    // Calories moyennes
    const dayCalMap: Record<string, number> = {};
    lastMonthMeals.forEach(m => {
      const cal = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
      dayCalMap[m.date] = (dayCalMap[m.date] ?? 0) + cal;
    });
    const calVals    = Object.values(dayCalMap);
    const avgCalories = calVals.length
      ? Math.round(calVals.reduce((a, b) => a + b, 0) / calVals.length)
      : 0;

    // Volume total
    const totalVolume = lastMonthWorkouts.reduce((s, w) =>
      s + w.exercises.reduce((sv, e) =>
        sv + e.sets.reduce((ss, set) => ss + set.reps * set.weight, 0), 0), 0);

    // Évolution du poids
    const startWeight  = monthWeights[0]?.weight;
    const endWeight    = monthWeights[monthWeights.length - 1]?.weight;
    const weightChange = startWeight && endWeight
      ? parseFloat((endWeight - startWeight).toFixed(1))
      : undefined;

    // Meilleur PR du mois
    const prMap: Record<string, { exerciseName: string; weight: number; reps: number }> = {};
    lastMonthWorkouts.forEach(w => {
      w.exercises.forEach(ex => {
        const best = ex.sets.reduce<{ w: number; r: number } | null>((b, s) =>
          !b || s.weight > b.w ? { w: s.weight, r: s.reps } : b, null);
        if (best && best.w > 0) {
          const curr = prMap[ex.exerciseId];
          if (!curr || best.w > curr.weight) {
            prMap[ex.exerciseId] = { exerciseName: ex.name, weight: best.w, reps: best.r };
          }
        }
      });
    });
    const bestPR = Object.values(prMap).sort((a, b) => b.weight - a.weight)[0];

    // Message du coach IA
    const coachMessage = await generateMonthlyMessage(user, {
      avgCalories,
      totalWorkouts: lastMonthWorkouts.length,
      weightChange,
    });

    const summary: MonthlySummary = {
      month:          lastMonthKey,
      avgCalories,
      totalWorkouts:  lastMonthWorkouts.length,
      startWeight,
      endWeight,
      weightChange,
      totalVolume,
      bestPR,
      coachMessage,
    };

    // Sauvegarder directement avec viewedAt pour éviter un double write
    await store.saveMonthlySummary({ ...summary, viewedAt: new Date().toISOString() });
    setTimeout(() => {
      router.push({ pathname: '/modals/monthly-summary', params: { month: lastMonthKey } });
    }, 800);
  }, [user, store, router]);

  useEffect(() => {
    if (!store.loading && user) generateMonthlyBilan();
  }, [store.loading, user]);

  const macros        = store.getTodayMacros();
  const burned        = store.getTodayBurned();
  const todayWorkouts = store.workouts.filter(w => w.date === storage.today());
  const todayMeals    = store.meals.filter(m => m.date === storage.today());

  // Animation d'entrée
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  if (store.loading || !user) return null;

  const waterGoal   = user.waterGoalMl ?? 2000;
  const waterPct    = Math.min(store.water.ml / waterGoal, 1);
  const waterColor  = waterPct >= 1 ? Colors.primary : waterPct >= 0.6 ? '#4a9eff' : waterPct >= 0.3 ? Colors.orange : Colors.red;
  const streak      = store.streak.current;
  const jokerMonth  = storage.thisMonth();
  const jokerAvail  = store.streak.jokerUsedMonth !== jokerMonth;

  // Objectif de poids
  const targetWeight  = user.targetWeight ?? (user.goal === 'weight_loss' ? user.weight * 0.9 : user.goal === 'muscle_gain' ? user.weight * 1.05 : null);
  const latestWeight  = store.weights[store.weights.length - 1]?.weight;
  const projectionDays = targetWeight && latestWeight ? weightProjection(store.weights, targetWeight) : null;
  const weightPct     = targetWeight && latestWeight ? Math.min(Math.abs(latestWeight - user.weight) / Math.abs(targetWeight - user.weight), 1) : 0;

  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <AnimatedScreen style={{ flex: 1 }}>
    <Animated.ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Bonjour {user.name} 👋</Text>
          <Text style={styles.date} numberOfLines={1}>{dateStr}</Text>
        </View>
        <View style={styles.headerRight}>
          {streak > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥{streak}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.avatarBtn}
            onPress={() => router.push('/modals/settings')}
            accessibilityLabel="Paramètres"
            accessibilityRole="button"
          >
            {user.name?.trim()
              ? <Text style={styles.avatarText}>{user.name[0].toUpperCase()}</Text>
              : <Ionicons name="person" size={18} color={Colors.primary} />
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Streak ──────────────────────────────────────────────────────────── */}
      {streak > 0 && (
        <Card style={[styles.streakCard, streak > 7 && styles.streakCardFire]}>
          <View style={styles.streakRow}>
            <Text style={styles.streakEmoji}>{streak > 7 ? '🔥' : '💪'}</Text>
            <View style={{ flex: 1 }}>
              <View style={styles.streakTitleRow}>
                <Text style={styles.streakTitle}>{streak} jour{streak > 1 ? 's' : ''} de streak</Text>
                {streak > 7 && (
                  <View style={styles.fireBadge}>
                    <Text style={styles.fireBadgeText}>En feu 🔥</Text>
                  </View>
                )}
              </View>
              <Text style={styles.streakSub}>💪 Séances consécutives • Meilleur : {store.streak.best}j</Text>
            </View>
            {jokerAvail && (
              <TouchableOpacity style={styles.jokerBtn} onPress={store.useJoker}>
                <Text style={styles.jokerBtnText}>🃏 Joker</Text>
              </TouchableOpacity>
            )}
          </View>
        </Card>
      )}

      {/* ── Anneau calories ─────────────────────────────────────────────────── */}
      <Card style={styles.ringCard}>
        <View style={styles.ringRow}>
          <AnimatedRing consumed={macros.calories} burned={burned} goal={user.targetCalories} size={155} />
          <View style={styles.ringStats}>
            <RingStat label="Objectif"  value={`${user.targetCalories}`} unit="kcal" color={Colors.text} />
            <RingStat label="Consommé"  value={`${Math.round(macros.calories)}`} unit="kcal" color={Colors.green} />
            <RingStat label="Brûlé"     value={`${burned}`} unit="kcal" color={Colors.orange} />
            <RingStat label="Net"       value={`${Math.round(macros.calories - burned)}`} unit="kcal" color={Colors.primary} />
          </View>
        </View>
      </Card>

      {/* ── Macros ──────────────────────────────────────────────────────────── */}
      <Card>
        <Text style={styles.sectionTitle}>Macronutriments</Text>
        <MacroBar label="Protéines" current={macros.protein} goal={user.targetProtein} color={Colors.proteinColor} />
        <MacroBar label="Glucides"  current={macros.carbs}   goal={user.targetCarbs}   color={Colors.carbsColor} />
        <MacroBar label="Lipides"   current={macros.fat}     goal={user.targetFat}      color={Colors.fatColor} />
      </Card>

      {/* ── Hydratation 💧 ──────────────────────────────────────────────────── */}
      <Card>
        <View style={styles.waterHeader}>
          <Text style={styles.sectionTitle}>Hydratation 💧</Text>
          <Text style={[styles.waterValue, { color: waterColor }]}>{store.water.ml}ml / {waterGoal}ml</Text>
        </View>
        {/* Barre de progression */}
        <View style={styles.waterTrack}>
          <Animated.View style={[styles.waterFill, { width: `${waterPct * 100}%`, backgroundColor: waterColor }]} />
        </View>
        {/* Boutons rapides */}
        <View style={styles.waterBtns}>
          {[250, 500, 750, 1000].map(ml => (
            <TouchableOpacity key={ml} style={[styles.waterBtn, { borderColor: waterColor + '40' }]} onPress={() => store.addWater(ml)}>
              <Text style={[styles.waterBtnText, { color: waterColor }]}>+{ml >= 1000 ? '1L' : `${ml}ml`}</Text>
            </TouchableOpacity>
          ))}
        </View>
        {waterPct >= 1 && <Text style={styles.waterDone}>💧 Objectif atteint ! Bravo</Text>}
      </Card>

      {/* ── Objectif de poids ───────────────────────────────────────────────── */}
      {targetWeight && latestWeight && (
        <Card>
          <Text style={styles.sectionTitle}>Mon objectif</Text>
          <View style={styles.goalRow}>
            <View>
              <Text style={styles.goalCurrent}>{latestWeight} kg</Text>
              <Text style={styles.goalLabel}>Actuel</Text>
            </View>
            <View style={styles.goalArrow}>
              <Ionicons name={user.goal === 'weight_loss' ? 'arrow-down' : 'arrow-up'} size={20} color={Colors.primary} />
            </View>
            <View>
              <Text style={[styles.goalCurrent, { color: Colors.primary }]}>{targetWeight.toFixed(1)} kg</Text>
              <Text style={styles.goalLabel}>Objectif</Text>
            </View>
          </View>
          {/* Barre de progression vers l'objectif */}
          <View style={styles.goalTrack}>
            <View style={[styles.goalFill, { width: `${Math.max(weightPct * 100, 2)}%` }]} />
          </View>
          {projectionDays !== null ? (
            <Text style={styles.goalProjection}>
              📈 À ce rythme : objectif dans <Text style={{ color: Colors.primary, fontWeight: Fw.bold }}>{projectionDays} jours</Text>
            </Text>
          ) : (
            <Text style={styles.goalProjection}>Enregistre ton poids régulièrement pour voir la projection</Text>
          )}
        </Card>
      )}

      {/* ── Stats du jour ───────────────────────────────────────────────────── */}
      <View style={styles.statRow}>
        <StatCard icon="barbell-outline" iconColor={Colors.primary}  value={todayWorkouts.length} label="Séances"  onPress={() => router.push('/(tabs)/workout')} />
        <StatCard icon="restaurant-outline" iconColor={Colors.green} value={todayMeals.length}    label="Repas"    onPress={() => router.push('/(tabs)/nutrition')} />
      </View>

      {/* ── Message du coach ─────────────────────────────────────────────────── */}
      <Card style={styles.coachCard}>
        <View style={styles.coachHeader}>
          <View style={styles.coachDot} />
          <Text style={styles.coachLabel}>FitCoach IA</Text>
        </View>
        <Text style={styles.coachMsg}>{coachMessage(user.name, macros.calories, user.targetCalories, burned, todayWorkouts.length)}</Text>
        <TouchableOpacity style={styles.coachBtn} onPress={() => router.push('/(tabs)/coach')}>
          <Text style={styles.coachBtnText}>Discuter avec le coach →</Text>
        </TouchableOpacity>
      </Card>

      {/* ── Actions rapides ─────────────────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <QuickAction icon="add-circle-outline" label="Séance"     color={Colors.primary}  onPress={() => router.push('/modals/add-workout')} />
        <QuickAction icon="restaurant-outline" label="Repas"      color={Colors.green}    onPress={() => router.push('/modals/add-food')} />
        <QuickAction icon="list-outline"       label="Programmes" color={Colors.primary}  onPress={() => router.push('/(tabs)/programs')} />
        <QuickAction icon="trending-up-outline" label="Progrès"   color={Colors.yellow}   onPress={() => router.push('/(tabs)/progress')} />
      </View>
    </Animated.ScrollView>
    </AnimatedScreen>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function RingStat({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', gap: 1 }}>
      <Text style={[{ fontSize: Fs.lg, fontWeight: Fw.bold, color }]}>{value}</Text>
      <Text style={{ fontSize: Fs.xs, color: Colors.textMuted }}>{unit}</Text>
      <Text style={{ fontSize: Fs.xs, color: Colors.textSecondary }}>{label}</Text>
    </View>
  );
}

function StatCard({ icon, iconColor, value, label, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; iconColor: string;
  value: number; label: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={scStyles.card} onPress={onPress}>
      <View style={[scStyles.iconBox, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={icon} size={22} color={iconColor} />
      </View>
      <Text style={scStyles.value}>{value}</Text>
      <Text style={scStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const scStyles = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, alignItems: 'center', gap: 4 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: Fs.xxl, fontWeight: Fw.bold, color: Colors.text },
  label: { fontSize: Fs.xs, color: Colors.textSecondary },
});

function QuickAction({ icon, label, color, onPress }: {
  icon: React.ComponentProps<typeof Ionicons>['name']; label: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={qaStyles.btn}
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
    >
      <View style={[qaStyles.icon, { backgroundColor: color + '18' }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={qaStyles.label}>{label}</Text>
    </TouchableOpacity>
  );
}
const qaStyles = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', gap: 5 },
  icon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: Fs.xs, color: Colors.textSecondary },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, paddingBottom: 100, gap: Sp.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sp.xs },
  greeting: { fontSize: Fs.xl, fontWeight: Fw.bold, color: Colors.text },
  date: { fontSize: Fs.sm, color: Colors.textSecondary, marginTop: 2, textTransform: 'capitalize' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  streakBadge: { backgroundColor: Colors.orange + '20', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4 },
  streakText: { fontSize: Fs.sm, fontWeight: Fw.bold, color: Colors.orange },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary + '30', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: Fs.md, fontWeight: Fw.bold, color: Colors.primary },
  // Streak card
  streakCard:     { borderColor: Colors.orange + '40', backgroundColor: Colors.orange + '08' },
  streakCardFire: { borderColor: Colors.red + '60', backgroundColor: Colors.red + '10' },
  streakRow:      { flexDirection: 'row', alignItems: 'center', gap: Sp.sm },
  streakEmoji:    { fontSize: 32 },
  streakTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakTitle:    { fontSize: Fs.md, fontWeight: Fw.bold, color: Colors.text },
  fireBadge:      { backgroundColor: Colors.red + '25', borderRadius: 99, paddingHorizontal: 7, paddingVertical: 2 },
  fireBadgeText:  { fontSize: Fs.xs, fontWeight: Fw.bold, color: Colors.red },
  streakSub:      { fontSize: Fs.xs, color: Colors.textSecondary, marginTop: 2 },
  jokerBtn:       { backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: Colors.border },
  jokerBtnText:   { fontSize: Fs.xs, fontWeight: Fw.semibold, color: Colors.text },
  // Ring
  ringCard: {},
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Sp.md },
  ringStats: { flex: 1, gap: 10 },
  sectionTitle: { fontSize: Fs.xs, fontWeight: Fw.semibold, color: Colors.textSecondary, marginBottom: Sp.sm, textTransform: 'uppercase', letterSpacing: 0.5 },
  // Eau
  waterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Sp.sm },
  waterValue: { fontSize: Fs.sm, fontWeight: Fw.semibold },
  waterTrack: { height: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: Sp.sm },
  waterFill: { height: '100%', borderRadius: 99 },
  waterBtns: { flexDirection: 'row', gap: Sp.xs },
  waterBtn: { flex: 1, borderRadius: R, borderWidth: 1, paddingVertical: 8, alignItems: 'center' },
  waterBtnText: { fontSize: Fs.xs, fontWeight: Fw.semibold },
  waterDone: { fontSize: Fs.xs, color: Colors.primary, textAlign: 'center', marginTop: 6 },
  // Objectif poids
  goalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Sp.sm },
  goalCurrent: { fontSize: Fs.xl, fontWeight: Fw.bold, color: Colors.text },
  goalLabel: { fontSize: Fs.xs, color: Colors.textMuted },
  goalArrow: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  goalTrack: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden', marginBottom: 8 },
  goalFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 99 },
  goalProjection: { fontSize: Fs.xs, color: Colors.textSecondary, lineHeight: 18 },
  // Stats
  statRow: { flexDirection: 'row', gap: Sp.sm },
  // Coach
  coachCard: {},
  coachHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  coachDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.green },
  coachLabel: { fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.primary },
  coachMsg: { fontSize: Fs.sm, color: Colors.textSecondary, lineHeight: 20 },
  coachBtn: { marginTop: 10 },
  coachBtnText: { fontSize: Fs.sm, color: Colors.primary, fontWeight: Fw.medium },
  actionsRow: { flexDirection: 'row', gap: Sp.xs },
});
