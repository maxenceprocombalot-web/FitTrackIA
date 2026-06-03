import { useState, useEffect, useCallback } from 'react';
import {
  User, WorkoutSession, Meal, WeightEntry, ChatMessage,
  PersonalRecord, MacroTotals, ActiveProgram,
  FavoriteMeal, WaterEntry, StreakData, SavedPlan, MonthlySummary,
  FoodItem,
} from '../types';
import * as S from '../services/storage';
import { PREDEFINED_PLANS } from '../constants/predefined-plans';

// ─── État global ──────────────────────────────────────────────────────────────

interface AppState {
  user: User | null;
  workouts: WorkoutSession[];
  meals: Meal[];
  weights: WeightEntry[];
  chat: ChatMessage[];
  prs: PersonalRecord[];
  activeProgram: ActiveProgram | null;
  favorites: FavoriteMeal[];
  water: WaterEntry;       // hydratation du jour
  streak: StreakData;
  savedPlans: SavedPlan[]; // prédéfinis + utilisateur
  recentFoods: FoodItem[];
  monthlySummaries: MonthlySummary[];
  loading: boolean;
}

let _state: AppState = {
  user: null, workouts: [], meals: [], weights: [],
  chat: [], prs: [], activeProgram: null,
  favorites: [], water: { date: S.today(), ml: 0 },
  streak: { current: 0, best: 0, lastWorkoutDate: '' },
  savedPlans: PREDEFINED_PLANS, recentFoods: [],
  monthlySummaries: [], loading: true,
};

const _listeners = new Set<() => void>();

function setState(patch: Partial<AppState>) {
  _state = { ..._state, ...patch };
  _listeners.forEach(fn => fn());
}

// ─── Calcul du streak depuis les séances ──────────────────────────────────────

function computeStreak(workouts: WorkoutSession[], stored: StreakData): StreakData {
  const dates = [...new Set(workouts.map(w => w.date))].sort().reverse();
  if (!dates.length) return { ...stored, current: 0 };

  const todayStr     = S.today();
  const yesterdayStr = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

  // Le streak se casse si la dernière séance n'est ni aujourd'hui ni hier
  if (dates[0] !== todayStr && dates[0] !== yesterdayStr) {
    return { ...stored, current: 0, lastWorkoutDate: dates[0] };
  }

  let streak = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) / 86_400_000;
    if (Math.round(diff) === 1) streak++;
    else break;
  }
  const best = Math.max(streak, stored.best);
  return { ...stored, current: streak, best, lastWorkoutDate: dates[0] };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAppStore() {
  const [, tick] = useState(0);

  useEffect(() => {
    const fn = () => tick(n => n + 1);
    _listeners.add(fn);
    return () => { _listeners.delete(fn); };
  }, []);

  // Chargement initial de toutes les données
  const refresh = useCallback(async () => {
    const [
      user, workouts, meals, weights, chat, prs,
      activeProgram, favorites, storedStreak,
      userSavedPlans, recentFoods, monthlySummaries,
    ] = await Promise.all([
      S.loadUser(), S.loadWorkouts(), S.loadMeals(), S.loadWeights(),
      S.loadChat(), S.loadPRs(), S.loadActiveProgram(), S.loadFavorites(),
      S.loadStreak(), S.loadSavedPlans(), S.loadRecentFoods(), S.loadMonthlySummaries(),
    ]);

    // Hydratation : reset si nouveau jour
    const waterToday = await S.loadWaterEntry(S.today());

    // Streak calculé dynamiquement
    const streak = computeStreak(workouts, storedStreak ?? { current: 0, best: 0, lastWorkoutDate: '' });
    await S.saveStreak(streak);

    // Plans = prédéfinis toujours présents + plans utilisateur (sans doublons)
    const userPlanIds = new Set(PREDEFINED_PLANS.map(p => p.id));
    const allPlans = [
      ...PREDEFINED_PLANS,
      ...userSavedPlans.filter(p => !userPlanIds.has(p.id)),
    ];

    setState({
      user, workouts, meals, weights, chat, prs, activeProgram,
      favorites, water: waterToday, streak, savedPlans: allPlans,
      recentFoods, monthlySummaries, loading: false,
    });
  }, []);

  useEffect(() => { if (_state.loading) refresh(); }, [refresh]);

  // ─── Utilisateur ────────────────────────────────────────────────────────────

  const setUser = useCallback(async (u: User) => {
    await S.saveUser(u);
    setState({ user: u });
  }, []);

  // ─── Séances ────────────────────────────────────────────────────────────────

  const addWorkout = useCallback(async (w: WorkoutSession) => {
    await S.saveWorkout(w);
    const workouts = [w, ..._state.workouts];
    const streak   = computeStreak(workouts, _state.streak);
    await S.saveStreak(streak);
    setState({ workouts, streak });
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    await S.deleteWorkout(id);
    const workouts = _state.workouts.filter(w => w.id !== id);
    const streak   = computeStreak(workouts, _state.streak);
    setState({ workouts, streak });
  }, []);

  // ─── Repas ──────────────────────────────────────────────────────────────────

  const addMeal = useCallback(async (m: Meal) => {
    await S.saveMeal(m);
    const exists = _state.meals.some(x => x.id === m.id);
    setState({ meals: exists ? _state.meals.map(x => x.id === m.id ? m : x) : [m, ..._state.meals] });
  }, []);

  const updateMeal = useCallback(async (m: Meal) => {
    await S.saveMeal(m);
    setState({ meals: _state.meals.map(x => x.id === m.id ? m : x) });
  }, []);

  const deleteMeal = useCallback(async (id: string) => {
    await S.deleteMeal(id);
    setState({ meals: _state.meals.filter(m => m.id !== id) });
  }, []);

  // ─── Poids ──────────────────────────────────────────────────────────────────

  const addWeight = useCallback(async (e: WeightEntry) => {
    await S.saveWeight(e);
    const next = [..._state.weights.filter(w => w.date !== e.date), e].sort((a, b) => a.date.localeCompare(b.date));
    setState({ weights: next });
  }, []);

  // ─── Chat ────────────────────────────────────────────────────────────────────

  const addChatMessage = useCallback(async (msg: ChatMessage) => {
    const next = [..._state.chat, msg];
    await S.saveChat(next);
    setState({ chat: next });
  }, []);

  const clearChat = useCallback(async () => {
    await S.saveChat([]);
    setState({ chat: [] });
  }, []);

  // ─── PRs ──────────────────────────────────────────────────────────────────

  const checkAndSavePR = useCallback(async (
    exerciseId: string, exerciseName: string, weight: number, reps: number,
  ): Promise<boolean> => {
    const existing = _state.prs.find(p => p.exerciseId === exerciseId);
    if (!existing || weight > existing.weight) {
      const pr: PersonalRecord = { exerciseId, exerciseName, weight, reps, date: S.today(), previousWeight: existing?.weight };
      await S.savePR(pr);
      setState({ prs: [..._state.prs.filter(p => p.exerciseId !== exerciseId), pr] });
      return true;
    }
    return false;
  }, []);

  // ─── Programme actif ─────────────────────────────────────────────────────────

  const startProgram = useCallback(async (programId: string) => {
    const ap: ActiveProgram = { programId, startDate: S.today() };
    await S.saveActiveProgram(ap);
    setState({ activeProgram: ap });
  }, []);

  const stopProgram = useCallback(async () => {
    await S.clearActiveProgram();
    setState({ activeProgram: null });
  }, []);

  const getProgramWeek = useCallback((): number => {
    if (!_state.activeProgram) return 1;
    const days = Math.floor((Date.now() - new Date(_state.activeProgram.startDate).getTime()) / 86_400_000);
    return Math.floor(days / 7) + 1;
  }, []);

  // ─── Repas favoris ───────────────────────────────────────────────────────────

  const addFavorite = useCallback(async (f: FavoriteMeal) => {
    await S.saveFavorite(f);
    setState({ favorites: [f, ..._state.favorites.filter(x => x.id !== f.id)] });
  }, []);

  const deleteFavorite = useCallback(async (id: string) => {
    await S.deleteFavorite(id);
    setState({ favorites: _state.favorites.filter(f => f.id !== id) });
  }, []);

  // ─── Hydratation ─────────────────────────────────────────────────────────────

  const addWater = useCallback(async (ml: number) => {
    const entry: WaterEntry = { date: S.today(), ml: (_state.water.ml + ml) };
    await S.saveWaterEntry(entry);
    setState({ water: entry });
  }, []);

  const resetWater = useCallback(async () => {
    const entry: WaterEntry = { date: S.today(), ml: 0 };
    await S.saveWaterEntry(entry);
    setState({ water: entry });
  }, []);

  // ─── Streak joker ────────────────────────────────────────────────────────────

  const useJoker = useCallback(async () => {
    const month = S.thisMonth();
    if (_state.streak.jokerUsedMonth === month) return false;
    const streak: StreakData = {
      ..._state.streak,
      current: _state.streak.current + 1,
      jokerUsedMonth: month,
    };
    await S.saveStreak(streak);
    setState({ streak });
    return true;
  }, []);

  // ─── Plans sauvegardés ───────────────────────────────────────────────────────

  const savePlan = useCallback(async (p: SavedPlan) => {
    await S.savePlan(p);
    const exists = _state.savedPlans.some(x => x.id === p.id);
    setState({ savedPlans: exists ? _state.savedPlans.map(x => x.id === p.id ? p : x) : [p, ..._state.savedPlans] });
  }, []);

  const deletePlan = useCallback(async (id: string) => {
    const plan = _state.savedPlans.find(p => p.id === id);
    if (plan?.isPredefined) return; // non supprimable
    await S.deletePlan(id);
    setState({ savedPlans: _state.savedPlans.filter(p => p.id !== id) });
  }, []);

  // ─── Aliments récents ────────────────────────────────────────────────────────

  const pushRecentFood = useCallback(async (item: FoodItem) => {
    await S.pushRecentFood(item);
    const next = [item, ..._state.recentFoods.filter(f => f.name !== item.name)].slice(0, 10);
    setState({ recentFoods: next });
  }, []);

  // ─── Bilan mensuel ───────────────────────────────────────────────────────────

  const saveMonthlySummary = useCallback(async (s: MonthlySummary) => {
    await S.saveMonthlySummary(s);
    const exists = _state.monthlySummaries.some(x => x.month === s.month);
    setState({
      monthlySummaries: exists
        ? _state.monthlySummaries.map(x => x.month === s.month ? s : x)
        : [s, ..._state.monthlySummaries],
    });
  }, []);

  // ─── Calculs dérivés ──────────────────────────────────────────────────────────

  const getTodayMacros = useCallback((): MacroTotals => {
    const t = S.today();
    return _state.meals
      .filter(m => m.date === t)
      .reduce<MacroTotals>((acc, meal) => {
        meal.items.forEach(item => {
          const r = item.quantity / 100;
          acc.calories += item.caloriesPer100g * r;
          acc.protein  += item.proteinPer100g  * r;
          acc.carbs    += item.carbsPer100g    * r;
          acc.fat      += item.fatPer100g      * r;
        });
        return acc;
      }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, []);

  const getTodayBurned = useCallback((): number =>
    _state.workouts.filter(w => w.date === S.today()).reduce((s, w) => s + w.caloriesBurned, 0),
  []);

  const getRecentWorkouts = useCallback((days = 7): WorkoutSession[] => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
    return _state.workouts.filter(w => w.date >= since);
  }, []);

  const getRecentMeals = useCallback((days = 7): Meal[] => {
    const since = new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
    return _state.meals.filter(m => m.date >= since);
  }, []);

  return {
    ..._state,
    refresh,
    setUser,
    addWorkout, deleteWorkout,
    addMeal, updateMeal, deleteMeal,
    addWeight,
    addChatMessage, clearChat,
    checkAndSavePR,
    startProgram, stopProgram, getProgramWeek,
    addFavorite, deleteFavorite,
    addWater, resetWater,
    useJoker,
    savePlan, deletePlan,
    pushRecentFood,
    saveMonthlySummary,
    getTodayMacros, getTodayBurned, getRecentWorkouts, getRecentMeals,
  };
}
