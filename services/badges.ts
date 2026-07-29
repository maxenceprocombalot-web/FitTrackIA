import { WeeklyChallenge } from '../types';
import { localISO } from './date';

/** Forme minimale du store nécessaire au calcul — évite de coupler ce service à l'UI. */
type BadgeStore = {
  workouts: any[]; meals: any[]; weights: any[]; prs: any[];
  streak: { best: number }; chat: any[];
  user: { targetCalories: number; createdAt?: string } | null;
};

// ─── Badges helper ────────────────────────────────────────────────────────────

export function getUnlockedBadges(store: BadgeStore): Set<string> {
  const unlocked = new Set<string>();
  const { workouts, meals, weights, prs, streak, chat, user } = store;

  if (workouts.length >= 1)   unlocked.add('b01');
  if (streak.best >= 7)       unlocked.add('b02');
  if (prs.length >= 1)        unlocked.add('b03');
  if (prs.length >= 10)       unlocked.add('b04');

  const mealDays = new Set(meals.map((m: any) => m.date)).size;
  if (mealDays >= 30)         unlocked.add('b05');
  if (workouts.length >= 100) unlocked.add('b06');

  if (user) {
    let streak7 = 0;
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = localISO(d);
      const dayMeals = meals.filter((m: any) => m.date === ds);
      if (!dayMeals.length) { streak7 = 0; continue; }
      const cal = dayMeals.flatMap((m: any) => m.items).reduce((s: number, item: any) => s + item.caloriesPer100g * item.quantity / 100, 0);
      if (cal >= user.targetCalories * 0.9 && cal <= user.targetCalories * 1.1) streak7++;
      else streak7 = 0;
      if (streak7 >= 7) { unlocked.add('b07'); break; }
    }
  }

  const workoutTypes = new Set(workouts.map((w: any) => w.type)).size;
  if (workoutTypes >= 5) unlocked.add('b09');

  if (user?.createdAt) {
    const days = Math.floor((Date.now() - new Date(user.createdAt).getTime()) / 86400000);
    if (days >= 365) unlocked.add('b10');
  }

  const cardioW = workouts.filter((w: any) => w.type === 'cardio' || w.type === 'running').length;
  if (cardioW >= 10) unlocked.add('b11');
  if (cardioW >= 50) unlocked.add('b20');

  if (meals.length >= 100) unlocked.add('b12');
  if (weights.length >= 7) unlocked.add('b13');

  const totalVolume = workouts.reduce((sv: number, w: any) => sv + w.exercises.reduce((se: number, e: any) => se + e.sets.reduce((ss: number, st: any) => ss + st.reps * st.weight, 0), 0), 0);
  if (totalVolume >= 10000) unlocked.add('b14');

  if (chat.filter((m: any) => m.role === 'user').length >= 20) unlocked.add('b17');

  if (unlocked.size >= 10) unlocked.add('b18');

  if (user && weights.length >= 2) {
    const startW = weights[0].weight;
    const lastW  = weights[weights.length - 1].weight;
    if (Math.abs(lastW - startW) >= 5) unlocked.add('b19');
  }

  return unlocked;
}

// ─── Helpers défis ────────────────────────────────────────────────────────────

export function getDefaultChallenges(weekKey: string, user: BadgeStore['user']): WeeklyChallenge[] {
  return [
    { id: 'ch1', weekKey, emoji: '💪', title: '4 séances cette semaine', description: 'Réalise 4 séances d\'entraînement', type: 'workouts', target: 4, completed: false },
    { id: 'ch2', weekKey, emoji: '🎯', title: 'Objectif calorique 5 jours', description: `Reste dans ±10% de ${user?.targetCalories ?? 2000} kcal pendant 5 jours`, type: 'cal_days', target: 5, completed: false },
    { id: 'ch3', weekKey, emoji: '🏃', title: '2 séances de cardio', description: 'Réalise 2 séances cardio ou course', type: 'cardio', target: 2, completed: false },
  ];
}

export function getChallengeProgress(challenge: WeeklyChallenge, weekKey: string, store: BadgeStore): number {
  const mon = new Date(weekKey + 'T12:00:00');
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
  const since = weekKey;
  const until = localISO(sun);

  switch (challenge.type) {
    case 'workouts':
      return store.workouts.filter((w: any) => w.date >= since && w.date <= until).length;
    case 'cal_days': {
      const target = store.user?.targetCalories ?? 2000;
      const dm: Record<string, number> = {};
      store.meals.filter((m: any) => m.date >= since && m.date <= until).forEach((m: any) => {
        const c = m.items.reduce((s: number, i: any) => s + i.caloriesPer100g * i.quantity / 100, 0);
        dm[m.date] = (dm[m.date] ?? 0) + c;
      });
      return Object.values(dm).filter((v: number) => v >= target * 0.9 && v <= target * 1.1).length;
    }
    case 'cardio':
      return store.workouts.filter((w: any) => w.date >= since && w.date <= until && (w.type === 'cardio' || w.type === 'running')).length;
    default: return 0;
  }
}
