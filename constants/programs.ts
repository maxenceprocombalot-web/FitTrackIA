// Bibliothèque de 10 programmes sportifs prêts à l'emploi

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgramCategory = 'Full Body' | 'Upper/Lower' | 'PPL' | 'Brosplit' | 'Cardio';
export type ProgramLevel    = 'Débutant' | 'Intermédiaire' | 'Avancé';
export type ProgramGoal     = 'Force' | 'Hypertrophie' | 'Perte de poids' | 'Endurance';

/** Exercice dans un programme (template, pas un log) */
export interface ProgramExercise {
  name: string;
  sets: number;
  reps: string;    // ex: "8", "8-12", "échec", "30s"
  rest: number;    // secondes
  notes?: string;
}

/** Séance d'un programme liée à un jour de la semaine (1=Lundi…7=Dimanche) */
export interface ProgramSession {
  id: string;
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  dayLabel: string;   // "Lundi"
  name: string;       // "Pectoraux / Triceps"
  focus: string;      // tag court pour affichage
  exercises: ProgramExercise[];
}

/** Programme complet */
export interface ProgramTemplate {
  id: string;
  name: string;
  emoji: string;
  category: ProgramCategory;
  level: ProgramLevel;
  daysPerWeek: number;
  goal: ProgramGoal;
  sessionDuration: number; // minutes estimées
  description: string;
  sessions: ProgramSession[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_LABELS: Record<number, string> = {
  1: 'Lundi', 2: 'Mardi', 3: 'Mercredi', 4: 'Jeudi',
  5: 'Vendredi', 6: 'Samedi', 7: 'Dimanche',
};

// ─── 1. Full Body Débutant 3j ─────────────────────────────────────────────────

const FB_DEBUTANT: ProgramTemplate = {
  id: 'fb_debutant',
  name: 'Full Body Débutant 3j',
  emoji: '🌱',
  category: 'Full Body',
  level: 'Débutant',
  daysPerWeek: 3,
  goal: 'Hypertrophie',
  sessionDuration: 50,
  description: 'Programme idéal pour débuter. 3 séances complètes par semaine qui sollicitent tous les groupes musculaires. Progression linéaire sur les charges.',
  sessions: [
    {
      id: 'fbd_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Full Body A', focus: 'Poussée',
      exercises: [
        { name: 'Squat barre',              sets: 3, reps: '12',   rest: 90,  notes: 'Descendre sous parallèle' },
        { name: 'Développé couché barre',   sets: 3, reps: '12',   rest: 90 },
        { name: 'Rowing haltère unilatéral', sets: 3, reps: '12',   rest: 90 },
        { name: 'Développé militaire barre', sets: 3, reps: '10',   rest: 90 },
        { name: 'Curl haltères',            sets: 3, reps: '12',   rest: 60 },
        { name: 'Extension triceps poulie', sets: 3, reps: '12',   rest: 60 },
        { name: 'Gainage planche',          sets: 3, reps: '30s',  rest: 45 },
      ],
    },
    {
      id: 'fbd_b', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Full Body B', focus: 'Tirage',
      exercises: [
        { name: 'Presse à cuisses',         sets: 3, reps: '12',   rest: 90 },
        { name: 'Pompes',                   sets: 3, reps: '15',   rest: 75 },
        { name: 'Tirage poulie haute',      sets: 3, reps: '12',   rest: 90 },
        { name: 'Élévations latérales',     sets: 3, reps: '15',   rest: 60 },
        { name: 'Hammer curl',             sets: 3, reps: '12',   rest: 60 },
        { name: 'Dips triceps banc',        sets: 3, reps: '12',   rest: 60 },
        { name: 'Leg raise',               sets: 3, reps: '15',   rest: 45 },
      ],
    },
    {
      id: 'fbd_c', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Full Body C', focus: 'Mixte',
      exercises: [
        { name: 'Fentes avant haltères',    sets: 3, reps: '12',   rest: 90,  notes: 'Chaque jambe' },
        { name: 'Développé haltères plat',  sets: 3, reps: '12',   rest: 90 },
        { name: 'Rowing barre',             sets: 3, reps: '10',   rest: 90 },
        { name: 'Arnold press',             sets: 3, reps: '10',   rest: 75 },
        { name: 'Curl barre',               sets: 3, reps: '12',   rest: 60 },
        { name: 'Barre au front',           sets: 3, reps: '12',   rest: 60 },
        { name: 'Russian twist',            sets: 3, reps: '20',   rest: 45 },
      ],
    },
  ],
};

// ─── 2. Full Body Force 3j ────────────────────────────────────────────────────

const FB_FORCE: ProgramTemplate = {
  id: 'fb_force',
  name: 'Full Body Force 3j',
  emoji: '⚡',
  category: 'Full Body',
  level: 'Intermédiaire',
  daysPerWeek: 3,
  goal: 'Force',
  sessionDuration: 60,
  description: 'Basé sur les mouvements composés lourds. Progression par petits incréments chaque semaine sur les 3 levés principaux (Squat, Bench, Deadlift).',
  sessions: [
    {
      id: 'fbf_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Force A — Squat dominant', focus: 'Force',
      exercises: [
        { name: 'Squat barre',              sets: 5, reps: '5',    rest: 180, notes: '+2.5kg/semaine' },
        { name: 'Développé couché barre',   sets: 5, reps: '5',    rest: 180, notes: '+2.5kg/semaine' },
        { name: 'Rowing barre',             sets: 5, reps: '5',    rest: 180 },
        { name: 'Curl barre',               sets: 3, reps: '8',    rest: 90 },
        { name: 'Extension triceps poulie', sets: 3, reps: '10',   rest: 90 },
        { name: 'Gainage planche',          sets: 3, reps: '45s',  rest: 60 },
      ],
    },
    {
      id: 'fbf_b', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Force B — Press dominant', focus: 'Force',
      exercises: [
        { name: 'Squat barre',              sets: 5, reps: '5',    rest: 180 },
        { name: 'Développé militaire barre', sets: 5, reps: '5',   rest: 180, notes: '+1.25kg/semaine' },
        { name: 'Soulevé de terre',         sets: 1, reps: '5',    rest: 240, notes: '+5kg/semaine' },
        { name: 'Tractions pronation',      sets: 3, reps: '5-8',  rest: 120, notes: 'Ajouter lest si besoin' },
        { name: 'Élévations latérales',     sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'fbf_c', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Force C — Deadlift dominant', focus: 'Force',
      exercises: [
        { name: 'Squat barre',              sets: 5, reps: '5',    rest: 180 },
        { name: 'Développé couché barre',   sets: 5, reps: '5',    rest: 180 },
        { name: 'Soulevé de terre',         sets: 1, reps: '5',    rest: 240 },
        { name: 'Tirage poulie haute',      sets: 3, reps: '8',    rest: 90 },
        { name: 'Dips pectoraux',           sets: 3, reps: 'échec',rest: 90 },
      ],
    },
  ],
};

// ─── 3. Upper Lower Classique 4j ──────────────────────────────────────────────

const UL_CLASSIQUE: ProgramTemplate = {
  id: 'ul_classique',
  name: 'Upper Lower Classique 4j',
  emoji: '🔁',
  category: 'Upper/Lower',
  level: 'Intermédiaire',
  daysPerWeek: 4,
  goal: 'Hypertrophie',
  sessionDuration: 60,
  description: '4 jours avec alternance haut/bas du corps. Permet 2 stimulations par groupe musculaire par semaine pour une hypertrophie optimale.',
  sessions: [
    {
      id: 'ul_upper_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Upper A — Horizontal', focus: 'Haut Push/Pull',
      exercises: [
        { name: 'Développé couché barre',   sets: 4, reps: '8',    rest: 120 },
        { name: 'Rowing barre',             sets: 4, reps: '8',    rest: 120 },
        { name: 'Développé incliné haltères', sets: 3, reps: '10', rest: 90 },
        { name: 'Tirage poulie haute',      sets: 3, reps: '10',   rest: 90 },
        { name: 'Curl barre',               sets: 3, reps: '12',   rest: 60 },
        { name: 'Extension triceps poulie', sets: 3, reps: '12',   rest: 60 },
        { name: 'Face pull',                sets: 3, reps: '15',   rest: 45 },
      ],
    },
    {
      id: 'ul_lower_a', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Lower A — Quad dominant', focus: 'Jambes Quads',
      exercises: [
        { name: 'Squat barre',              sets: 4, reps: '8',    rest: 150 },
        { name: 'Leg press',                sets: 3, reps: '12',   rest: 90 },
        { name: 'Leg extension',            sets: 3, reps: '12',   rest: 75 },
        { name: 'Leg curl couché',          sets: 3, reps: '12',   rest: 75 },
        { name: 'Fentes avant haltères',    sets: 3, reps: '10',   rest: 75, notes: 'Chaque jambe' },
        { name: 'Mollets debout',           sets: 4, reps: '15',   rest: 60 },
        { name: 'Gainage planche',          sets: 3, reps: '45s',  rest: 45 },
      ],
    },
    {
      id: 'ul_upper_b', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Upper B — Vertical', focus: 'Haut Push/Pull',
      exercises: [
        { name: 'Développé militaire barre', sets: 4, reps: '8',   rest: 120 },
        { name: 'Tractions pronation',      sets: 4, reps: '6-8',  rest: 120, notes: 'Lest si trop facile' },
        { name: 'Arnold press',             sets: 3, reps: '10',   rest: 90 },
        { name: 'Rowing haltère unilatéral', sets: 3, reps: '10',  rest: 90 },
        { name: 'Hammer curl',              sets: 3, reps: '12',   rest: 60 },
        { name: 'Barre au front',           sets: 3, reps: '12',   rest: 60 },
        { name: 'Élévations latérales',     sets: 4, reps: '15',   rest: 45 },
      ],
    },
    {
      id: 'ul_lower_b', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Lower B — Post chain', focus: 'Jambes Post',
      exercises: [
        { name: 'Soulevé de terre',         sets: 4, reps: '6',    rest: 180 },
        { name: 'Hip thrust barre',         sets: 4, reps: '12',   rest: 90 },
        { name: 'Fentes bulgares',          sets: 3, reps: '10',   rest: 90, notes: 'Chaque jambe' },
        { name: 'Leg curl couché',          sets: 4, reps: '12',   rest: 75 },
        { name: 'Squat sumo haltères',      sets: 3, reps: '12',   rest: 75 },
        { name: 'Mollets debout',           sets: 4, reps: '15',   rest: 60 },
        { name: 'Ab wheel',                 sets: 3, reps: '10',   rest: 60 },
      ],
    },
  ],
};

// ─── 4. Upper Lower Force 4j ──────────────────────────────────────────────────

const UL_FORCE: ProgramTemplate = {
  id: 'ul_force',
  name: 'Upper Lower Force 4j',
  emoji: '🏋️',
  category: 'Upper/Lower',
  level: 'Avancé',
  daysPerWeek: 4,
  goal: 'Force',
  sessionDuration: 75,
  description: 'Progression linéaire sur les 4 levés fondamentaux (Squat, Deadlift, Bench, OHP). Alternance volume/intensité pour briser les plateaux.',
  sessions: [
    {
      id: 'ulf_upper_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Upper Force A — Intensité', focus: 'Force haut',
      exercises: [
        { name: 'Développé couché barre',   sets: 5, reps: '3',    rest: 240, notes: '85-90% 1RM' },
        { name: 'Rowing barre',             sets: 5, reps: '3',    rest: 240 },
        { name: 'Développé incliné haltères', sets: 3, reps: '8',  rest: 120 },
        { name: 'Tirage horizontal câble',  sets: 3, reps: '10',   rest: 90 },
        { name: 'Curl barre',               sets: 3, reps: '8',    rest: 75 },
        { name: 'Extension triceps poulie', sets: 3, reps: '10',   rest: 75 },
      ],
    },
    {
      id: 'ulf_lower_a', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Lower Force A — Squat', focus: 'Force jambes',
      exercises: [
        { name: 'Squat barre',              sets: 5, reps: '3',    rest: 240, notes: '85-90% 1RM' },
        { name: 'Leg press',                sets: 4, reps: '8',    rest: 120 },
        { name: 'Leg curl couché',          sets: 3, reps: '8',    rest: 90 },
        { name: 'Mollets debout',           sets: 4, reps: '12',   rest: 60 },
        { name: 'Gainage planche',          sets: 3, reps: '60s',  rest: 60 },
      ],
    },
    {
      id: 'ulf_upper_b', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Upper Force B — Volume', focus: 'Force haut',
      exercises: [
        { name: 'Développé couché barre',   sets: 4, reps: '6',    rest: 180, notes: '75-80% 1RM' },
        { name: 'Tractions pronation',      sets: 4, reps: '6',    rest: 180, notes: 'Lest obligatoire' },
        { name: 'Développé militaire barre', sets: 4, reps: '5',   rest: 180 },
        { name: 'Rowing haltère unilatéral', sets: 3, reps: '8',   rest: 90 },
        { name: 'Dips pectoraux',           sets: 3, reps: '8',    rest: 90, notes: 'Lest si >12 reps faciles' },
        { name: 'Face pull',                sets: 3, reps: '15',   rest: 60 },
      ],
    },
    {
      id: 'ulf_lower_b', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Lower Force B — Deadlift', focus: 'Force jambes',
      exercises: [
        { name: 'Soulevé de terre',         sets: 5, reps: '3',    rest: 300, notes: '85-90% 1RM' },
        { name: 'Hip thrust barre',         sets: 4, reps: '8',    rest: 120 },
        { name: 'Fentes bulgares',          sets: 3, reps: '8',    rest: 90, notes: 'Haltères lourds' },
        { name: 'Leg curl couché',          sets: 3, reps: '10',   rest: 90 },
        { name: 'Mollets debout',           sets: 4, reps: '12',   rest: 60 },
        { name: 'Ab wheel',                 sets: 4, reps: '12',   rest: 60 },
      ],
    },
  ],
};

// ─── 5. PPL Hypertrophie 6j ───────────────────────────────────────────────────

const PPL_HYPERTROPHIE: ProgramTemplate = {
  id: 'ppl_hypertrophie',
  name: 'PPL Hypertrophie 6j',
  emoji: '💥',
  category: 'PPL',
  level: 'Avancé',
  daysPerWeek: 6,
  goal: 'Hypertrophie',
  sessionDuration: 70,
  description: 'Push/Pull/Legs 6 jours par semaine en haute intensité. Volume élevé sur chaque groupe musculaire pour une hypertrophie maximale. Dimanche = récupération.',
  sessions: [
    {
      id: 'ppl_push_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Push A — Pecs/Épaules/Triceps', focus: 'Push',
      exercises: [
        { name: 'Développé couché barre',   sets: 4, reps: '8',    rest: 120 },
        { name: 'Développé incliné haltères', sets: 4, reps: '10', rest: 90 },
        { name: 'Écarté poulie croisée',    sets: 3, reps: '12',   rest: 75 },
        { name: 'Développé militaire barre', sets: 4, reps: '8',   rest: 120 },
        { name: 'Élévations latérales',     sets: 4, reps: '15',   rest: 60 },
        { name: 'Extension triceps poulie', sets: 3, reps: '12',   rest: 60 },
        { name: 'Barre au front',           sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'ppl_pull_a', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Pull A — Dos/Biceps', focus: 'Pull',
      exercises: [
        { name: 'Tractions pronation',      sets: 4, reps: '8',    rest: 120 },
        { name: 'Rowing barre',             sets: 4, reps: '8',    rest: 120 },
        { name: 'Tirage poulie haute',      sets: 3, reps: '10',   rest: 90 },
        { name: 'Rowing haltère unilatéral', sets: 3, reps: '10',  rest: 90 },
        { name: 'Face pull',                sets: 3, reps: '15',   rest: 60 },
        { name: 'Curl barre',               sets: 3, reps: '10',   rest: 60 },
        { name: 'Hammer curl',              sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'ppl_legs_a', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Legs A — Quads/Ischios/Mollets', focus: 'Legs',
      exercises: [
        { name: 'Squat barre',              sets: 4, reps: '8',    rest: 150 },
        { name: 'Leg press',                sets: 4, reps: '12',   rest: 90 },
        { name: 'Leg extension',            sets: 3, reps: '15',   rest: 75 },
        { name: 'Leg curl couché',          sets: 3, reps: '12',   rest: 75 },
        { name: 'Fentes bulgares',          sets: 3, reps: '10',   rest: 90, notes: 'Chaque jambe' },
        { name: 'Mollets debout',           sets: 5, reps: '15',   rest: 60 },
      ],
    },
    {
      id: 'ppl_push_b', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Push B — Épaules/Pecs/Triceps', focus: 'Push',
      exercises: [
        { name: 'Développé militaire barre', sets: 4, reps: '6',   rest: 150 },
        { name: 'Arnold press',             sets: 4, reps: '10',   rest: 90 },
        { name: 'Développé couché barre',   sets: 3, reps: '10',   rest: 90 },
        { name: 'Pull-over haltère',        sets: 3, reps: '12',   rest: 75 },
        { name: 'Élévations latérales',     sets: 5, reps: '15',   rest: 45 },
        { name: 'Dips pectoraux',           sets: 3, reps: 'échec',rest: 90 },
        { name: 'Kick-back triceps',        sets: 3, reps: '15',   rest: 45 },
      ],
    },
    {
      id: 'ppl_pull_b', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Pull B — Dos/Biceps', focus: 'Pull',
      exercises: [
        { name: 'Soulevé de terre',         sets: 3, reps: '5',    rest: 240 },
        { name: 'Tirage horizontal câble',  sets: 4, reps: '10',   rest: 90 },
        { name: 'Shrug barre',              sets: 4, reps: '15',   rest: 60 },
        { name: 'Oiseau (Rear Delt)',       sets: 4, reps: '15',   rest: 60 },
        { name: 'Curl haltères',            sets: 4, reps: '10',   rest: 60 },
        { name: 'Préacher curl',            sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'ppl_legs_b', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Legs B — Post-chaîne/Glutes', focus: 'Legs',
      exercises: [
        { name: 'Hip thrust barre',         sets: 4, reps: '10',   rest: 120 },
        { name: 'Soulevé de terre jambes tendues', sets: 4, reps: '10', rest: 90 },
        { name: 'Leg curl couché',          sets: 4, reps: '12',   rest: 75 },
        { name: 'Squat sumo haltères',      sets: 3, reps: '12',   rest: 90 },
        { name: 'Mollets debout',           sets: 5, reps: '20',   rest: 45 },
        { name: 'Crunch',                   sets: 4, reps: '20',   rest: 45 },
      ],
    },
  ],
};

// ─── 6. PPL Intermédiaire 6j ──────────────────────────────────────────────────

const PPL_INTERMEDIAIRE: ProgramTemplate = {
  id: 'ppl_intermediaire',
  name: 'PPL Intermédiaire 6j',
  emoji: '📈',
  category: 'PPL',
  level: 'Intermédiaire',
  daysPerWeek: 6,
  goal: 'Hypertrophie',
  sessionDuration: 60,
  description: 'Version PPL accessible pour les intermédiaires. Volume modéré avec des charges progressives chaque semaine. Mercredi = repos actif optionnel.',
  sessions: [
    {
      id: 'ppli_push', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Push — Pecs/Épaules/Triceps', focus: 'Push',
      exercises: [
        { name: 'Développé couché barre',   sets: 4, reps: '10',   rest: 90 },
        { name: 'Développé incliné haltères', sets: 3, reps: '10', rest: 90 },
        { name: 'Développé militaire barre', sets: 3, reps: '10',  rest: 90 },
        { name: 'Élévations latérales',     sets: 3, reps: '15',   rest: 60 },
        { name: 'Extension triceps poulie', sets: 3, reps: '12',   rest: 60 },
        { name: 'Dips triceps banc',        sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'ppli_pull', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Pull — Dos/Biceps', focus: 'Pull',
      exercises: [
        { name: 'Tractions pronation',      sets: 3, reps: '8',    rest: 120, notes: 'Élastique si besoin' },
        { name: 'Rowing barre',             sets: 4, reps: '10',   rest: 90 },
        { name: 'Tirage poulie haute',      sets: 3, reps: '12',   rest: 90 },
        { name: 'Face pull',                sets: 3, reps: '15',   rest: 60 },
        { name: 'Curl haltères',            sets: 3, reps: '12',   rest: 60 },
        { name: 'Hammer curl',              sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'ppli_legs', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Legs — Jambes complètes', focus: 'Legs',
      exercises: [
        { name: 'Squat barre',              sets: 4, reps: '10',   rest: 120 },
        { name: 'Leg press',                sets: 3, reps: '12',   rest: 90 },
        { name: 'Fentes avant haltères',    sets: 3, reps: '10',   rest: 90, notes: 'Chaque jambe' },
        { name: 'Leg curl couché',          sets: 3, reps: '12',   rest: 75 },
        { name: 'Mollets debout',           sets: 4, reps: '15',   rest: 60 },
        { name: 'Gainage planche',          sets: 3, reps: '45s',  rest: 45 },
      ],
    },
    {
      id: 'ppli_push2', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Push 2 — Variation', focus: 'Push',
      exercises: [
        { name: 'Développé haltères plat',  sets: 4, reps: '10',   rest: 90 },
        { name: 'Arnold press',             sets: 3, reps: '12',   rest: 90 },
        { name: 'Écarté poulie croisée',    sets: 3, reps: '15',   rest: 60 },
        { name: 'Élévations frontales',     sets: 3, reps: '12',   rest: 60 },
        { name: 'Barre au front',           sets: 3, reps: '12',   rest: 60 },
        { name: 'Kick-back triceps',        sets: 3, reps: '15',   rest: 45 },
      ],
    },
    {
      id: 'ppli_pull2', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Pull 2 — Variation', focus: 'Pull',
      exercises: [
        { name: 'Rowing haltère unilatéral', sets: 4, reps: '10',  rest: 90 },
        { name: 'Tirage horizontal câble',  sets: 3, reps: '12',   rest: 90 },
        { name: 'Oiseau (Rear Delt)',       sets: 3, reps: '15',   rest: 60 },
        { name: 'Shrug barre',              sets: 3, reps: '15',   rest: 60 },
        { name: 'Curl barre',               sets: 3, reps: '10',   rest: 60 },
        { name: 'Préacher curl',            sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'ppli_legs2', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Legs 2 — Post-chaîne', focus: 'Legs',
      exercises: [
        { name: 'Hip thrust barre',         sets: 4, reps: '12',   rest: 90 },
        { name: 'Soulevé de terre',         sets: 3, reps: '8',    rest: 150 },
        { name: 'Leg curl couché',          sets: 4, reps: '12',   rest: 75 },
        { name: 'Squat sumo haltères',      sets: 3, reps: '12',   rest: 90 },
        { name: 'Mollets debout',           sets: 4, reps: '20',   rest: 45 },
        { name: 'Russian twist',            sets: 3, reps: '20',   rest: 45 },
      ],
    },
  ],
};

// ─── 7. Brosplit Classique 5j ─────────────────────────────────────────────────

const BROSPLIT_CLASSIQUE: ProgramTemplate = {
  id: 'brosplit_classique',
  name: 'Brosplit Classique 5j',
  emoji: '💪',
  category: 'Brosplit',
  level: 'Intermédiaire',
  daysPerWeek: 5,
  goal: 'Hypertrophie',
  sessionDuration: 65,
  description: '1 groupe musculaire par séance, 5 jours par semaine. Permet de concentrer tout le volume sur un seul muscle. Classique des salles de musculation.',
  sessions: [
    {
      id: 'bs_pec', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Pectoraux', focus: 'Chest',
      exercises: [
        { name: 'Développé couché barre',   sets: 4, reps: '8',    rest: 120 },
        { name: 'Développé incliné haltères', sets: 4, reps: '10', rest: 90 },
        { name: 'Développé décliné barre',  sets: 3, reps: '10',   rest: 90 },
        { name: 'Écarté poulie croisée',    sets: 4, reps: '12',   rest: 75 },
        { name: 'Pull-over haltère',        sets: 3, reps: '12',   rest: 75 },
        { name: 'Dips pectoraux',           sets: 3, reps: 'échec',rest: 90 },
      ],
    },
    {
      id: 'bs_dos', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Dos', focus: 'Back',
      exercises: [
        { name: 'Tractions pronation',      sets: 4, reps: '8',    rest: 120 },
        { name: 'Rowing barre',             sets: 4, reps: '8',    rest: 120 },
        { name: 'Tirage poulie haute',      sets: 4, reps: '10',   rest: 90 },
        { name: 'Rowing haltère unilatéral', sets: 3, reps: '10',  rest: 90 },
        { name: 'Tirage horizontal câble',  sets: 3, reps: '12',   rest: 75 },
        { name: 'Shrug barre',              sets: 4, reps: '15',   rest: 60 },
      ],
    },
    {
      id: 'bs_epaules', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Épaules', focus: 'Shoulders',
      exercises: [
        { name: 'Développé militaire barre', sets: 4, reps: '8',   rest: 120 },
        { name: 'Arnold press',             sets: 3, reps: '10',   rest: 90 },
        { name: 'Élévations latérales',     sets: 5, reps: '15',   rest: 60 },
        { name: 'Élévations frontales',     sets: 3, reps: '12',   rest: 60 },
        { name: 'Oiseau (Rear Delt)',       sets: 4, reps: '15',   rest: 60 },
        { name: 'Upright row',              sets: 3, reps: '12',   rest: 75 },
        { name: 'Face pull',                sets: 3, reps: '15',   rest: 45 },
      ],
    },
    {
      id: 'bs_bras', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Bras', focus: 'Arms',
      exercises: [
        { name: 'Curl barre',               sets: 4, reps: '10',   rest: 90 },
        { name: 'Curl haltères',            sets: 3, reps: '12',   rest: 75 },
        { name: 'Préacher curl',            sets: 3, reps: '12',   rest: 75 },
        { name: 'Hammer curl',              sets: 3, reps: '12',   rest: 60 },
        { name: 'Extension triceps poulie', sets: 4, reps: '12',   rest: 75 },
        { name: 'Barre au front',           sets: 3, reps: '12',   rest: 75 },
        { name: 'Dips triceps banc',        sets: 3, reps: 'échec',rest: 90 },
      ],
    },
    {
      id: 'bs_jambes', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Jambes', focus: 'Legs',
      exercises: [
        { name: 'Squat barre',              sets: 5, reps: '8',    rest: 150 },
        { name: 'Leg press',                sets: 4, reps: '12',   rest: 90 },
        { name: 'Leg extension',            sets: 4, reps: '15',   rest: 75 },
        { name: 'Leg curl couché',          sets: 4, reps: '12',   rest: 75 },
        { name: 'Hip thrust barre',         sets: 4, reps: '12',   rest: 90 },
        { name: 'Mollets debout',           sets: 5, reps: '20',   rest: 45 },
      ],
    },
  ],
};

// ─── 8. Arnold Split 6j ───────────────────────────────────────────────────────

const ARNOLD_SPLIT: ProgramTemplate = {
  id: 'arnold_split',
  name: 'Arnold Split 6j',
  emoji: '🦁',
  category: 'Brosplit',
  level: 'Avancé',
  daysPerWeek: 6,
  goal: 'Hypertrophie',
  sessionDuration: 80,
  description: "Le programme légendaire d'Arnold Schwarzenegger. Chaque groupe est travaillé 2× par semaine en alternant Pecs+Dos / Épaules+Bras / Jambes.",
  sessions: [
    {
      id: 'as_pec_dos_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Pectoraux + Dos A', focus: 'Push+Pull',
      exercises: [
        { name: 'Développé couché barre',   sets: 4, reps: '8',    rest: 120 },
        { name: 'Tractions pronation',      sets: 4, reps: '8',    rest: 120 },
        { name: 'Développé incliné haltères', sets: 4, reps: '10', rest: 90 },
        { name: 'Rowing barre',             sets: 4, reps: '10',   rest: 90 },
        { name: 'Écarté poulie croisée',    sets: 3, reps: '12',   rest: 75 },
        { name: 'Tirage poulie haute',      sets: 3, reps: '12',   rest: 75 },
        { name: 'Pull-over haltère',        sets: 3, reps: '12',   rest: 75 },
      ],
    },
    {
      id: 'as_ep_bras_a', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Épaules + Bras A', focus: 'Shoulders+Arms',
      exercises: [
        { name: 'Développé militaire barre', sets: 4, reps: '8',   rest: 120 },
        { name: 'Curl barre',               sets: 4, reps: '10',   rest: 90 },
        { name: 'Élévations latérales',     sets: 4, reps: '12',   rest: 75 },
        { name: 'Extension triceps poulie', sets: 4, reps: '12',   rest: 75 },
        { name: 'Oiseau (Rear Delt)',       sets: 3, reps: '15',   rest: 60 },
        { name: 'Hammer curl',              sets: 3, reps: '12',   rest: 60 },
        { name: 'Barre au front',           sets: 3, reps: '12',   rest: 60 },
      ],
    },
    {
      id: 'as_jambes_a', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Jambes A', focus: 'Legs',
      exercises: [
        { name: 'Squat barre',              sets: 5, reps: '8',    rest: 180 },
        { name: 'Presse à cuisses',         sets: 4, reps: '12',   rest: 90 },
        { name: 'Fentes bulgares',          sets: 3, reps: '10',   rest: 90, notes: 'Chaque jambe' },
        { name: 'Leg extension',            sets: 4, reps: '15',   rest: 75 },
        { name: 'Leg curl couché',          sets: 4, reps: '12',   rest: 75 },
        { name: 'Mollets debout',           sets: 5, reps: '20',   rest: 45 },
      ],
    },
    {
      id: 'as_pec_dos_b', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Pectoraux + Dos B', focus: 'Push+Pull',
      exercises: [
        { name: 'Développé haltères plat',  sets: 4, reps: '8',    rest: 120 },
        { name: 'Rowing haltère unilatéral', sets: 4, reps: '10',  rest: 90 },
        { name: 'Développé décliné barre',  sets: 3, reps: '10',   rest: 90 },
        { name: 'Tirage horizontal câble',  sets: 4, reps: '10',   rest: 90 },
        { name: 'Pompes',                   sets: 3, reps: 'échec',rest: 75 },
        { name: 'Shrug barre',              sets: 4, reps: '15',   rest: 60 },
      ],
    },
    {
      id: 'as_ep_bras_b', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Épaules + Bras B', focus: 'Shoulders+Arms',
      exercises: [
        { name: 'Arnold press',             sets: 4, reps: '10',   rest: 90 },
        { name: 'Préacher curl',            sets: 4, reps: '10',   rest: 75 },
        { name: 'Upright row',              sets: 3, reps: '12',   rest: 75 },
        { name: 'Dips triceps banc',        sets: 4, reps: 'échec',rest: 90 },
        { name: 'Élévations frontales',     sets: 3, reps: '12',   rest: 60 },
        { name: 'Curl haltères',            sets: 3, reps: '12',   rest: 60 },
        { name: 'Kick-back triceps',        sets: 3, reps: '15',   rest: 45 },
      ],
    },
    {
      id: 'as_jambes_b', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Jambes B', focus: 'Legs',
      exercises: [
        { name: 'Hip thrust barre',         sets: 5, reps: '10',   rest: 120 },
        { name: 'Soulevé de terre',         sets: 4, reps: '6',    rest: 180 },
        { name: 'Squat sumo haltères',      sets: 3, reps: '12',   rest: 90 },
        { name: 'Leg curl couché',          sets: 4, reps: '12',   rest: 75 },
        { name: 'Mollets debout',           sets: 5, reps: '20',   rest: 45 },
        { name: 'Gainage planche',          sets: 3, reps: '60s',  rest: 45 },
      ],
    },
  ],
};

// ─── 9. Programme Cardio 3j ───────────────────────────────────────────────────

const CARDIO_3J: ProgramTemplate = {
  id: 'cardio_3j',
  name: 'Programme Cardio 3j',
  emoji: '🏃',
  category: 'Cardio',
  level: 'Débutant',
  daysPerWeek: 3,
  goal: 'Perte de poids',
  sessionDuration: 40,
  description: 'Alternance HIIT intense et cardio steady-state pour bruler un maximum de calories. Aucune charge nécessaire. Idéal pour débuter la perte de poids.',
  sessions: [
    {
      id: 'cardio_hiit', dayOfWeek: 1, dayLabel: 'Lundi', name: 'HIIT — Haute intensité', focus: 'HIIT',
      exercises: [
        { name: 'Échauffement tapis',       sets: 1, reps: '5min', rest: 0,  notes: '5km/h' },
        { name: 'Sprint court 30s / récup 90s', sets: 8, reps: '30s', rest: 90, notes: '90% effort max' },
        { name: 'Corde à sauter',           sets: 3, reps: '60s',  rest: 60 },
        { name: 'Burpees',                  sets: 4, reps: '10',   rest: 60 },
        { name: 'Mountain climbers',        sets: 3, reps: '30s',  rest: 45 },
        { name: 'Retour au calme tapis',    sets: 1, reps: '5min', rest: 0,  notes: '4km/h' },
      ],
    },
    {
      id: 'cardio_steady', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Steady State — Endurance', focus: 'Cardio',
      exercises: [
        { name: 'Course sur tapis',         sets: 1, reps: '35min',rest: 0,  notes: '65-70% FCmax — zone 2' },
        { name: 'Étirements dynamiques',    sets: 1, reps: '10min',rest: 0 },
      ],
    },
    {
      id: 'cardio_circuit', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Circuit Cardio', focus: 'Circuit',
      exercises: [
        { name: 'Vélo stationnaire',        sets: 1, reps: '10min',rest: 0,  notes: 'Intensité modérée' },
        { name: 'Sauts en étoile (Jumping jacks)', sets: 3, reps: '45s', rest: 30 },
        { name: 'Rameur',                   sets: 3, reps: '3min', rest: 60, notes: 'Rythme modéré' },
        { name: 'Elliptique',               sets: 1, reps: '10min',rest: 0 },
        { name: 'Gainage planche',          sets: 3, reps: '45s',  rest: 30 },
        { name: 'Leg raise',                sets: 3, reps: '15',   rest: 30 },
      ],
    },
  ],
};

// ─── 10. Programme Mixte Cardio + Muscu 4j ────────────────────────────────────

const MIXTE_4J: ProgramTemplate = {
  id: 'mixte_4j',
  name: 'Programme Mixte Cardio + Muscu 4j',
  emoji: '🔥',
  category: 'Cardio',
  level: 'Intermédiaire',
  daysPerWeek: 4,
  goal: 'Perte de poids',
  sessionDuration: 55,
  description: 'Combine renforcement musculaire et cardio pour transformer la composition corporelle. Idéal pour perdre du gras tout en maintenant la masse musculaire.',
  sessions: [
    {
      id: 'mixte_fb_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Full Body + Finisher Cardio', focus: 'Muscu',
      exercises: [
        { name: 'Squat barre',              sets: 3, reps: '12',   rest: 75 },
        { name: 'Développé couché barre',   sets: 3, reps: '12',   rest: 75 },
        { name: 'Rowing barre',             sets: 3, reps: '12',   rest: 75 },
        { name: 'Développé militaire barre', sets: 3, reps: '10',  rest: 75 },
        { name: 'Fentes avant haltères',    sets: 3, reps: '12',   rest: 60, notes: 'Chaque jambe' },
        { name: 'Gainage planche',          sets: 3, reps: '45s',  rest: 30 },
        { name: 'Vélo stationnaire',        sets: 1, reps: '10min',rest: 0,  notes: 'Finisher — intensité modérée-haute' },
      ],
    },
    {
      id: 'mixte_hiit', dayOfWeek: 2, dayLabel: 'Mardi', name: 'HIIT Cardio', focus: 'Cardio',
      exercises: [
        { name: 'Échauffement',             sets: 1, reps: '5min', rest: 0 },
        { name: 'Interval 40s effort / 20s repos', sets: 10, reps: '40s', rest: 20, notes: 'Burpees, squats sautés, mountain climbers en rotation' },
        { name: 'Corde à sauter',           sets: 3, reps: '60s',  rest: 45 },
        { name: 'Course sur tapis',         sets: 1, reps: '10min',rest: 0,  notes: 'Zone 2 — récupération active' },
        { name: 'Étirements',               sets: 1, reps: '5min', rest: 0 },
      ],
    },
    {
      id: 'mixte_fb_b', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Full Body B + Finisher Cardio', focus: 'Muscu',
      exercises: [
        { name: 'Soulevé de terre',         sets: 3, reps: '10',   rest: 90 },
        { name: 'Développé incliné haltères', sets: 3, reps: '12', rest: 75 },
        { name: 'Tirage poulie haute',      sets: 3, reps: '12',   rest: 75 },
        { name: 'Hip thrust barre',         sets: 3, reps: '12',   rest: 75 },
        { name: 'Élévations latérales',     sets: 3, reps: '15',   rest: 60 },
        { name: 'Russian twist',            sets: 3, reps: '20',   rest: 30 },
        { name: 'Elliptique',               sets: 1, reps: '12min',rest: 0,  notes: 'Finisher — intensité modérée' },
      ],
    },
    {
      id: 'mixte_steady', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Cardio Steady State + Abdos', focus: 'Cardio',
      exercises: [
        { name: 'Course sur tapis',         sets: 1, reps: '30min',rest: 0,  notes: '65% FCmax — zone 2' },
        { name: 'Crunch',                   sets: 4, reps: '20',   rest: 30 },
        { name: 'Leg raise',                sets: 4, reps: '15',   rest: 30 },
        { name: 'Gainage planche',          sets: 3, reps: '45s',  rest: 30 },
        { name: 'Ab wheel',                 sets: 3, reps: '10',   rest: 45 },
      ],
    },
  ],
};

// ─── Export de la bibliothèque ────────────────────────────────────────────────

export const PROGRAMS: ProgramTemplate[] = [
  FB_DEBUTANT,
  FB_FORCE,
  UL_CLASSIQUE,
  UL_FORCE,
  PPL_HYPERTROPHIE,
  PPL_INTERMEDIAIRE,
  BROSPLIT_CLASSIQUE,
  ARNOLD_SPLIT,
  CARDIO_3J,
  MIXTE_4J,
];

// Couleurs et icônes par catégorie — alignées sur la charte OR & NOIR
export const CATEGORY_META: Record<ProgramCategory, { color: string; icon: string }> = {
  'Full Body':    { color: '#3FB96B', icon: '⚡' },
  'Upper/Lower':  { color: '#5B9BE8', icon: '🔁' },
  'PPL':          { color: '#E8B84B', icon: '🔄' },
  'Brosplit':     { color: '#E8894B', icon: '💪' },
  'Cardio':       { color: '#E8546B', icon: '🏃' },
};

export const LEVEL_COLOR: Record<ProgramLevel, string> = {
  'Débutant':      '#3FB96B',
  'Intermédiaire': '#F0CC5A',
  'Avancé':        '#E8546B',
};

export const GOAL_COLOR: Record<ProgramGoal, string> = {
  'Force':          '#5B9BE8',
  'Hypertrophie':   '#E8B84B',
  'Perte de poids': '#E8546B',
  'Endurance':      '#3FB96B',
};
