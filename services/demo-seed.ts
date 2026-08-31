// Génération de données de démonstration — DÉVELOPPEMENT UNIQUEMENT.
// Sert à produire les captures d'écran de la fiche App Store : une app vide
// ne montre rien de ce qu'elle sait faire. Jamais appelé en production (le
// bouton qui l'invoque est derrière __DEV__).

import * as S from './storage';
import { localISO } from './date';
import { WorkoutSession, Meal, WeightEntry, PersonalRecord } from '../types';

const daysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localISO(d);
};

const SEANCES = [
  { name: 'Push — Pecs / Épaules', type: 'strength' as const, exos: [
    { name: 'Développé couché barre', sets: [[8, 80], [8, 82.5], [6, 85]] },
    { name: 'Développé incliné haltères', sets: [[10, 30], [10, 30], [8, 32.5]] },
    { name: 'Élévations latérales', sets: [[15, 10], [15, 10], [12, 12]] },
    { name: 'Dips lestés', sets: [[10, 20], [8, 20], [8, 20]] },
  ]},
  { name: 'Pull — Dos / Biceps', type: 'strength' as const, exos: [
    { name: 'Tractions lestées', sets: [[8, 10], [7, 10], [6, 10]] },
    { name: 'Rowing barre', sets: [[10, 70], [10, 72.5], [8, 75]] },
    { name: 'Tirage vertical', sets: [[12, 60], [12, 62.5], [10, 65]] },
    { name: 'Curl haltères', sets: [[12, 14], [10, 14], [10, 14]] },
  ]},
  { name: 'Legs — Jambes', type: 'strength' as const, exos: [
    { name: 'Squat barre', sets: [[8, 100], [8, 105], [6, 110]] },
    { name: 'Soulevé de terre roumain', sets: [[10, 90], [10, 90], [8, 95]] },
    { name: 'Presse à cuisses', sets: [[12, 160], [12, 170], [10, 180]] },
    { name: 'Mollets debout', sets: [[15, 60], [15, 60], [15, 60]] },
  ]},
  { name: 'Course extérieure', type: 'running' as const, exos: [] },
];

const REPAS: { type: 'breakfast' | 'lunch' | 'dinner' | 'snack'; items: [string, number, number, number, number, number][] }[] = [
  { type: 'breakfast', items: [
    ['Flocons d\'avoine', 80, 379, 13.2, 60.1, 7.5],
    ['Banane', 120, 90, 1.1, 20.5, 0.3],
    ['Whey vanille', 30, 380, 78, 6, 4],
  ]},
  { type: 'lunch', items: [
    ['Riz blanc, cuit', 200, 145, 2.9, 31.8, 0.4],
    ['Poulet rôti, blanc', 180, 165, 31, 0, 3.6],
    ['Brocoli, cuit', 150, 34, 2.8, 4.5, 0.4],
    ['Huile d\'olive vierge extra', 10, 900, 0.2, 0, 99.9],
  ]},
  { type: 'dinner', items: [
    ['Saumon, cuit', 160, 208, 22.1, 0, 13.4],
    ['Patate douce, cuite', 200, 90, 2, 20.7, 0.1],
    ['Épinards, cuits', 150, 23, 2.9, 1.4, 0.4],
  ]},
  { type: 'snack', items: [
    ['Fromage blanc 0%', 200, 51, 8, 4, 0.3],
    ['Amandes', 25, 634, 21.4, 6.9, 53.4],
  ]},
];

/** Remplit l'app avec ~5 semaines d'historique cohérent. */
export async function seedDemoData(): Promise<void> {
  // Séances : 4 par semaine sur 5 semaines, charges en progression
  for (let week = 4; week >= 0; week--) {
    for (let i = 0; i < 4; i++) {
      const s = SEANCES[i];
      const day = week * 7 + (6 - i * 2);
      if (day < 0) continue;
      const bump = (4 - week) * 2.5; // progression hebdomadaire
      const w: WorkoutSession = {
        id: `demo_w_${week}_${i}`,
        date: daysAgo(day),
        name: s.name,
        type: s.type,
        duration: s.type === 'running' ? 45 : 68,
        caloriesBurned: s.type === 'running' ? 480 : 340,
        exercises: s.exos.map((e, ei) => ({
          id: `demo_e_${week}_${i}_${ei}`,
          exerciseId: e.name.toLowerCase().replace(/[^a-z]/g, '_').slice(0, 20),
          name: e.name,
          category: s.name.split(' — ')[1] ?? 'Général',
          sets: e.sets.map(([reps, kg]) => ({ reps, weight: kg + bump, completed: true })),
        })),
      };
      await S.saveWorkout(w);
    }
  }

  // Repas : 4 par jour sur 21 jours
  for (let d = 20; d >= 0; d--) {
    for (const r of REPAS) {
      const meal: Meal = {
        id: `demo_m_${d}_${r.type}`,
        date: daysAgo(d),
        type: r.type,
        items: r.items.map(([name, qty, kcal, p, c, f], i) => ({
          id: `demo_i_${d}_${r.type}_${i}`,
          name, quantity: qty,
          caloriesPer100g: kcal, proteinPer100g: p, carbsPer100g: c, fatPer100g: f,
        })),
      };
      await S.saveMeal(meal);
    }
  }

  // Poids : descente régulière sur 5 semaines
  for (let d = 35; d >= 0; d -= 3) {
    const e: WeightEntry = { date: daysAgo(d), weight: Math.round((82.4 - (35 - d) * 0.07) * 10) / 10 };
    await S.saveWeight(e);
  }

  // Records
  const prs: PersonalRecord[] = [
    { exerciseId: 'squat',  exerciseName: 'Squat barre',            weight: 110, reps: 6,  date: daysAgo(2) },
    { exerciseId: 'bench',  exerciseName: 'Développé couché barre', weight: 85,  reps: 6,  date: daysAgo(6) },
    { exerciseId: 'dl',     exerciseName: 'Soulevé de terre',       weight: 140, reps: 3,  date: daysAgo(9) },
    { exerciseId: 'pullup', exerciseName: 'Tractions lestées',      weight: 10,  reps: 8,  date: daysAgo(4) },
  ];
  for (const pr of prs) await S.savePR(pr);

  // Hydratation du jour
  await S.saveWaterEntry({ date: localISO(new Date()), ml: 1500 });

  // Série en cours
  await S.saveStreak({ current: 12, best: 21, lastWorkoutDate: daysAgo(0) });
}
