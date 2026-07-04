// ─── Calculs partagés : macros, 1RM, progression ─────────────────────────────
//
// Centralise des formules qui étaient dupliquées dans le store, les écrans
// nutrition/progress et les modals. Une seule source de vérité = moins de bugs.

import { FoodItem, Meal, MacroTotals, WorkoutSession, WeightEntry } from '../types';
import { localISO } from './date';

// ─── Macronutriments ──────────────────────────────────────────────────────────

const EMPTY: MacroTotals = { calories: 0, protein: 0, carbs: 0, fat: 0 };

/** Macros d'un aliment selon sa quantité (les valeurs sont pour 100 g). */
export function itemMacros(item: FoodItem): MacroTotals {
  const r = item.quantity / 100;
  return {
    calories: item.caloriesPer100g * r,
    protein:  item.proteinPer100g  * r,
    carbs:    item.carbsPer100g    * r,
    fat:      item.fatPer100g       * r,
  };
}

/** Somme des macros d'une liste d'aliments. */
export function sumItems(items: FoodItem[]): MacroTotals {
  return items.reduce<MacroTotals>((acc, item) => {
    const m = itemMacros(item);
    acc.calories += m.calories;
    acc.protein  += m.protein;
    acc.carbs    += m.carbs;
    acc.fat      += m.fat;
    return acc;
  }, { ...EMPTY });
}

/** Somme des macros d'une liste de repas. */
export function sumMeals(meals: Meal[]): MacroTotals {
  return meals.reduce<MacroTotals>((acc, meal) => {
    const m = sumItems(meal.items);
    acc.calories += m.calories;
    acc.protein  += m.protein;
    acc.carbs    += m.carbs;
    acc.fat      += m.fat;
    return acc;
  }, { ...EMPTY });
}

// ─── 1RM (répétition maximale estimée) ────────────────────────────────────────

/** 1RM estimé via la formule de Brzycki : weight / (1.0278 − 0.0278 × reps). */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  // Brzycki devient instable au-delà de ~12 reps : on plafonne à 12.
  const r = Math.min(reps, 12);
  return weight / (1.0278 - 0.0278 * r);
}

// ─── Surcharge progressive ────────────────────────────────────────────────────

export interface ExercisePerf {
  date: string;
  weight: number;  // meilleur poids de la séance
  reps: number;    // reps réalisées sur ce poids
}

/** Dernière performance enregistrée pour un exercice (par nom). */
export function lastPerformance(
  workouts: WorkoutSession[],
  exerciseName: string,
): ExercisePerf | null {
  // workouts est trié du plus récent au plus ancien dans le store, mais on ne
  // s'y fie pas : on trie par date décroissante pour être robuste.
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));
  for (const w of sorted) {
    const ex = w.exercises.find(e => e.name === exerciseName);
    if (!ex) continue;
    const weight = Math.max(0, ...ex.sets.map(s => s.weight));
    if (weight <= 0) continue;
    const reps = ex.sets.find(s => s.weight === weight)?.reps ?? 0;
    return { date: w.date, weight, reps };
  }
  return null;
}

export interface ProgressionSuggestion {
  last: ExercisePerf;
  weight: number;
  reps: number;
  /** Vrai si on conseille d'augmenter la charge. */
  increased: boolean;
  hint: string;
}

/** Incrément de charge adapté à la charge actuelle (rond pour la salle). */
function loadIncrement(weight: number): number {
  if (weight >= 60) return 5;
  if (weight >= 20) return 2.5;
  if (weight >= 10) return 2;
  return 1;
}

const round05 = (n: number): number => Math.round(n * 2) / 2;

/**
 * Suggestion de surcharge progressive (double progression).
 * Si la dernière séance a atteint le haut de la fourchette de reps → on monte la
 * charge et on repart au bas de la fourchette. Sinon → même charge, +1 rep.
 */
export function suggestProgression(
  workouts: WorkoutSession[],
  exerciseName: string,
  repRange: { min: number; max: number } = { min: 8, max: 12 },
): ProgressionSuggestion | null {
  const last = lastPerformance(workouts, exerciseName);
  if (!last || last.weight <= 0) return null;

  if (last.reps >= repRange.max) {
    const weight = round05(last.weight + loadIncrement(last.weight));
    return {
      last,
      weight,
      reps: repRange.min,
      increased: true,
      hint: `Tu as atteint ${last.reps} reps — monte à ${weight} kg`,
    };
  }

  return {
    last,
    weight: last.weight,
    reps: Math.min(last.reps + 1, repRange.max),
    increased: false,
    hint: `Vise ${Math.min(last.reps + 1, repRange.max)} reps à ${last.weight} kg`,
  };
}

// ─── Projection de poids (tendance lissée) ────────────────────────────────────

export interface WeightProjection {
  current: number;         // dernier poids enregistré
  slopePerWeek: number;    // kg/semaine (négatif = perte, positif = prise)
  target?: number;         // objectif de poids si défini
  etaDate?: string;        // date estimée d'atteinte de l'objectif (YYYY-MM-DD)
  onTrack: boolean;        // true si la tendance va vers l'objectif
}

const dayNumber = (iso: string): number =>
  Math.round(new Date(iso + 'T12:00:00').getTime() / 86_400_000);

/**
 * Régression linéaire sur les pesées pour estimer la tendance (kg/semaine) et,
 * si un objectif est défini, la date d'atteinte au rythme actuel.
 * Renvoie null si trop peu de données ou tendance plate.
 */
export function projectWeight(
  weights: WeightEntry[],
  target?: number,
): WeightProjection | null {
  const pts = [...weights]
    .filter(w => Number.isFinite(w.weight))
    .sort((a, b) => a.date.localeCompare(b.date));
  if (pts.length < 3) return null;

  const x0 = dayNumber(pts[0].date);
  const xs = pts.map(p => dayNumber(p.date) - x0);
  const ys = pts.map(p => p.weight);
  const n  = pts.length;

  // Pente des moindres carrés (kg/jour).
  const sx = xs.reduce((s, v) => s + v, 0);
  const sy = ys.reduce((s, v) => s + v, 0);
  const sxx = xs.reduce((s, v) => s + v * v, 0);
  const sxy = xs.reduce((s, v, i) => s + v * ys[i], 0);
  const denom = n * sxx - sx * sx;
  if (denom === 0) return null;
  const slopePerDay = (n * sxy - sx * sy) / denom;

  const current = ys[ys.length - 1];
  const slopePerWeek = slopePerDay * 7;

  const proj: WeightProjection = {
    current,
    slopePerWeek: Math.round(slopePerWeek * 100) / 100,
    target,
    onTrack: false,
  };

  if (target !== undefined && Math.abs(slopePerDay) > 1e-4) {
    const remaining = target - current;                 // signe = direction à prendre
    const movingToward = Math.sign(remaining) === Math.sign(slopePerDay);
    proj.onTrack = movingToward;
    if (movingToward) {
      const days = Math.round(remaining / slopePerDay);
      if (days > 0 && days < 3650) {                    // borne : < 10 ans
        const d = new Date();
        d.setDate(d.getDate() + days);
        proj.etaDate = localISO(d);
      }
    }
  }
  return proj;
}
