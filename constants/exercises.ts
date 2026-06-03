// 50 exercices pré-définis par catégorie

export type ExerciseCategory =
  | 'Pectoraux'
  | 'Dos'
  | 'Jambes'
  | 'Épaules'
  | 'Bras'
  | 'Abdos'
  | 'Cardio';

export interface ExerciseTemplate {
  id: string;
  name: string;
  category: ExerciseCategory;
  defaultSets: number;
  defaultReps: number;
  isCardio: boolean;
}

export const EXERCISES: ExerciseTemplate[] = [
  // ── Pectoraux ──────────────────────────────────────────
  { id: 'e01', name: 'Développé couché barre',    category: 'Pectoraux', defaultSets: 4, defaultReps: 8,  isCardio: false },
  { id: 'e02', name: 'Développé incliné haltères',category: 'Pectoraux', defaultSets: 3, defaultReps: 10, isCardio: false },
  { id: 'e03', name: 'Développé décliné barre',   category: 'Pectoraux', defaultSets: 3, defaultReps: 10, isCardio: false },
  { id: 'e04', name: 'Écarté poulie croisée',     category: 'Pectoraux', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e05', name: 'Dips pectoraux',             category: 'Pectoraux', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e06', name: 'Pompes',                     category: 'Pectoraux', defaultSets: 4, defaultReps: 15, isCardio: false },
  { id: 'e07', name: 'Pull-over haltère',          category: 'Pectoraux', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e08', name: 'Développé haltères plat',   category: 'Pectoraux', defaultSets: 4, defaultReps: 10, isCardio: false },

  // ── Dos ────────────────────────────────────────────────
  { id: 'e09', name: 'Tractions pronation',        category: 'Dos', defaultSets: 4, defaultReps: 8,  isCardio: false },
  { id: 'e10', name: 'Rowing barre',               category: 'Dos', defaultSets: 4, defaultReps: 8,  isCardio: false },
  { id: 'e11', name: 'Tirage poulie haute',        category: 'Dos', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e12', name: 'Rowing haltère unilatéral',  category: 'Dos', defaultSets: 3, defaultReps: 10, isCardio: false },
  { id: 'e13', name: 'Soulevé de terre',           category: 'Dos', defaultSets: 4, defaultReps: 5,  isCardio: false },
  { id: 'e14', name: 'Shrug barre',                category: 'Dos', defaultSets: 4, defaultReps: 12, isCardio: false },
  { id: 'e15', name: 'Tirage horizontal câble',    category: 'Dos', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e16', name: 'Face pull',                  category: 'Dos', defaultSets: 3, defaultReps: 15, isCardio: false },

  // ── Jambes ─────────────────────────────────────────────
  { id: 'e17', name: 'Squat barre',                category: 'Jambes', defaultSets: 4, defaultReps: 8,  isCardio: false },
  { id: 'e18', name: 'Presse à cuisses',           category: 'Jambes', defaultSets: 4, defaultReps: 10, isCardio: false },
  { id: 'e19', name: 'Fentes avant haltères',      category: 'Jambes', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e20', name: 'Leg extension',              category: 'Jambes', defaultSets: 3, defaultReps: 15, isCardio: false },
  { id: 'e21', name: 'Leg curl couché',            category: 'Jambes', defaultSets: 3, defaultReps: 15, isCardio: false },
  { id: 'e22', name: 'Mollets debout',             category: 'Jambes', defaultSets: 4, defaultReps: 20, isCardio: false },
  { id: 'e23', name: 'Leg press',                  category: 'Jambes', defaultSets: 4, defaultReps: 12, isCardio: false },
  { id: 'e24', name: 'Squat sumo haltères',        category: 'Jambes', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e25', name: 'Fentes bulgares',            category: 'Jambes', defaultSets: 3, defaultReps: 10, isCardio: false },
  { id: 'e26', name: 'Hip thrust barre',           category: 'Jambes', defaultSets: 4, defaultReps: 12, isCardio: false },

  // ── Épaules ────────────────────────────────────────────
  { id: 'e27', name: 'Développé militaire barre',  category: 'Épaules', defaultSets: 4, defaultReps: 8,  isCardio: false },
  { id: 'e28', name: 'Élévations latérales',       category: 'Épaules', defaultSets: 4, defaultReps: 15, isCardio: false },
  { id: 'e29', name: 'Oiseau (Rear Delt)',         category: 'Épaules', defaultSets: 3, defaultReps: 15, isCardio: false },
  { id: 'e30', name: 'Upright row',                category: 'Épaules', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e31', name: 'Élévations frontales',       category: 'Épaules', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e32', name: 'Arnold press',               category: 'Épaules', defaultSets: 3, defaultReps: 10, isCardio: false },

  // ── Bras ───────────────────────────────────────────────
  { id: 'e33', name: 'Curl haltères',              category: 'Bras', defaultSets: 4, defaultReps: 12, isCardio: false },
  { id: 'e34', name: 'Curl barre',                 category: 'Bras', defaultSets: 3, defaultReps: 10, isCardio: false },
  { id: 'e35', name: 'Hammer curl',                category: 'Bras', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e36', name: 'Extension triceps poulie',   category: 'Bras', defaultSets: 4, defaultReps: 15, isCardio: false },
  { id: 'e37', name: 'Barre au front',             category: 'Bras', defaultSets: 3, defaultReps: 12, isCardio: false },
  { id: 'e38', name: 'Dips triceps banc',          category: 'Bras', defaultSets: 3, defaultReps: 15, isCardio: false },
  { id: 'e39', name: 'Kick-back triceps',          category: 'Bras', defaultSets: 3, defaultReps: 15, isCardio: false },
  { id: 'e40', name: 'Préacher curl',              category: 'Bras', defaultSets: 3, defaultReps: 12, isCardio: false },

  // ── Abdos ──────────────────────────────────────────────
  { id: 'e41', name: 'Crunch',                     category: 'Abdos', defaultSets: 4, defaultReps: 20, isCardio: false },
  { id: 'e42', name: 'Gainage planche',            category: 'Abdos', defaultSets: 3, defaultReps: 60, isCardio: false },
  { id: 'e43', name: 'Russian twist',              category: 'Abdos', defaultSets: 3, defaultReps: 20, isCardio: false },
  { id: 'e44', name: 'Leg raise',                  category: 'Abdos', defaultSets: 3, defaultReps: 15, isCardio: false },
  { id: 'e45', name: 'Ab wheel',                   category: 'Abdos', defaultSets: 3, defaultReps: 12, isCardio: false },

  // ── Cardio ─────────────────────────────────────────────
  { id: 'e46', name: 'Course sur tapis',           category: 'Cardio', defaultSets: 1, defaultReps: 30, isCardio: true },
  { id: 'e47', name: 'Vélo stationnaire',          category: 'Cardio', defaultSets: 1, defaultReps: 30, isCardio: true },
  { id: 'e48', name: 'Rameur',                     category: 'Cardio', defaultSets: 1, defaultReps: 20, isCardio: true },
  { id: 'e49', name: 'Corde à sauter',             category: 'Cardio', defaultSets: 3, defaultReps: 100, isCardio: true },
  { id: 'e50', name: 'Elliptique',                 category: 'Cardio', defaultSets: 1, defaultReps: 30, isCardio: true },
];

// Catégories distinctes (ordre d'affichage)
export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  'Pectoraux', 'Dos', 'Jambes', 'Épaules', 'Bras', 'Abdos', 'Cardio',
];

// Calories brûlées estimées par minute selon le type de séance
export const CALORIES_PER_MIN: Record<string, number> = {
  strength: 5,
  cardio: 8,
  hiit: 11,
  yoga: 3,
  running: 9,
  other: 5,
};
