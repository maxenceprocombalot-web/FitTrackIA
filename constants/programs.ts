// Bibliothèque de 10 programmes sportifs prêts à l'emploi

// ─── Types ────────────────────────────────────────────────────────────────────

export type ProgramCategory =
  | 'Full Body' | 'Upper/Lower' | 'PPL' | 'Brosplit' | 'Cardio'
  | 'Course' | 'Trail' | 'Triathlon' | 'Natation' | 'Sport co' | 'Hyrox';
export type ProgramLevel    = 'Débutant' | 'Intermédiaire' | 'Avancé';
export type ProgramGoal     = 'Force' | 'Hypertrophie' | 'Perte de poids' | 'Endurance' | 'Performance';

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

// ═════════════════════════════════════════════════════════════════════════════
// MULTISPORT — course, trail, triathlon, natation, sports collectifs, Hyrox
// Le modèle sets/reps/rest exprime aussi bien une série de musculation qu'un
// bloc de fractionné : 8 × 400 m avec 90 s de récupération.
// ═════════════════════════════════════════════════════════════════════════════

const RUN_5K: ProgramTemplate = {
  id: 'run_5k',
  name: 'Premier 5 km',
  emoji: '🌱',
  category: 'Course',
  level: 'Débutant',
  daysPerWeek: 3,
  goal: 'Endurance',
  sessionDuration: 35,
  description: 'De zéro à 5 km courus sans marcher, en 8 semaines. Alternance marche/course qui laisse aux tendons le temps de suivre.',
  sessions: [
    {
      id: 'r5_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Marche/course', focus: 'Reprise',
      exercises: [
        { name: 'Échauffement marche rapide', sets: 1, reps: '10 min', rest: 0 },
        { name: 'Alternance 1 min course / 2 min marche', sets: 8, reps: '3 min', rest: 0, notes: 'Rester capable de parler' },
        { name: 'Retour au calme marche', sets: 1, reps: '5 min', rest: 0 },
      ],
    },
    {
      id: 'r5_b', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Course continue', focus: 'Endurance',
      exercises: [
        { name: 'Échauffement marche', sets: 1, reps: '8 min', rest: 0 },
        { name: 'Course continue très souple', sets: 1, reps: '12 min', rest: 0, notes: 'Allure conversationnelle' },
        { name: 'Marche récupération', sets: 1, reps: '5 min', rest: 0 },
        { name: 'Étirements mollets et ischios', sets: 3, reps: '30 s', rest: 15 },
      ],
    },
    {
      id: 'r5_c', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Sortie longue', focus: 'Volume',
      exercises: [
        { name: 'Échauffement marche', sets: 1, reps: '10 min', rest: 0 },
        { name: 'Alternance 3 min course / 1 min marche', sets: 6, reps: '4 min', rest: 0 },
        { name: 'Gainage planche', sets: 3, reps: '30 s', rest: 45 },
      ],
    },
  ],
};

const RUN_10K: ProgramTemplate = {
  id: 'run_10k',
  name: '10 km chrono',
  emoji: '👟',
  category: 'Course',
  level: 'Intermédiaire',
  daysPerWeek: 4,
  goal: 'Performance',
  sessionDuration: 55,
  description: 'Casser son record sur 10 km. Deux séances de qualité par semaine, le reste en endurance fondamentale.',
  sessions: [
    {
      id: 'r10_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Endurance fondamentale', focus: 'Aérobie',
      exercises: [
        { name: 'Footing en zone 2', sets: 1, reps: '45 min', rest: 0, notes: 'Doit rester facile, c est le socle' },
      ],
    },
    {
      id: 'r10_b', dayOfWeek: 2, dayLabel: 'Mardi', name: 'VMA courte', focus: 'Vitesse',
      exercises: [
        { name: 'Échauffement progressif', sets: 1, reps: '20 min', rest: 0 },
        { name: '30/30 : 30 s vite / 30 s trot', sets: 12, reps: '1 min', rest: 0, notes: 'Meilleur transfert pour le 10 km' },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'r10_c', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Seuil', focus: 'Résistance',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Bloc au seuil (allure semi)', sets: 3, reps: '8 min', rest: 120 },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'r10_d', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Sortie longue', focus: 'Volume',
      exercises: [
        { name: 'Footing long en zone 2', sets: 1, reps: '70 min', rest: 0 },
        { name: 'Gainage complet', sets: 3, reps: '45 s', rest: 45 },
      ],
    },
  ],
};

const RUN_SEMI: ProgramTemplate = {
  id: 'run_semi',
  name: 'Semi-marathon',
  emoji: '🏅',
  category: 'Course',
  level: 'Intermédiaire',
  daysPerWeek: 4,
  goal: 'Endurance',
  sessionDuration: 70,
  description: '12 semaines pour boucler un semi. Montée progressive du volume et travail spécifique à l allure course.',
  sessions: [
    {
      id: 'rs_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Endurance', focus: 'Aérobie',
      exercises: [
        { name: 'Footing zone 2', sets: 1, reps: '50 min', rest: 0 },
        { name: 'Éducatifs de course (montées de genoux, talons-fesses)', sets: 4, reps: '30 m', rest: 30 },
      ],
    },
    {
      id: 'rs_b', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Allure spécifique', focus: 'Seuil',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Bloc à allure semi', sets: 4, reps: '10 min', rest: 90 },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'rs_c', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Côtes', focus: 'Force',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Montées en côte à 85 %', sets: 8, reps: '45 s', rest: 90, notes: 'Descente en trot très souple' },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'rs_d', dayOfWeek: 7, dayLabel: 'Dimanche', name: 'Sortie longue', focus: 'Volume',
      exercises: [
        { name: 'Sortie longue progressive', sets: 1, reps: '1 h 40', rest: 0, notes: 'Finir plus vite que commencer' },
        { name: 'Gainage et mobilité hanches', sets: 3, reps: '60 s', rest: 45 },
      ],
    },
  ],
};

const RUN_MARA: ProgramTemplate = {
  id: 'run_marathon',
  name: 'Marathon',
  emoji: '🏆',
  category: 'Course',
  level: 'Avancé',
  daysPerWeek: 5,
  goal: 'Endurance',
  sessionDuration: 85,
  description: '16 semaines vers le marathon. Le volume prime, la qualité reste dosée pour arriver frais sur la ligne.',
  sessions: [
    {
      id: 'rm_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Récupération active', focus: 'Aérobie',
      exercises: [
        { name: 'Footing très souple', sets: 1, reps: '40 min', rest: 0 },
      ],
    },
    {
      id: 'rm_b', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Fractionné long', focus: 'VMA',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '20 min', rest: 0 },
        { name: 'Répétitions de 1000 m à allure 10 km', sets: 6, reps: '1000 m', rest: 180 },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'rm_c', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Allure marathon', focus: 'Spécifique',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Bloc à allure marathon', sets: 2, reps: '20 min', rest: 180 },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'rm_d', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Renforcement', focus: 'Prévention',
      exercises: [
        { name: 'Squat', sets: 4, reps: '8', rest: 120 },
        { name: 'Fentes marchées', sets: 3, reps: '12 par jambe', rest: 90 },
        { name: 'Mollets debout', sets: 4, reps: '15', rest: 60 },
        { name: 'Gainage planche et latéral', sets: 3, reps: '60 s', rest: 45 },
      ],
    },
    {
      id: 'rm_e', dayOfWeek: 7, dayLabel: 'Dimanche', name: 'Sortie longue', focus: 'Volume',
      exercises: [
        { name: 'Sortie longue en endurance', sets: 1, reps: '2 h 30', rest: 0, notes: 'Tester ravitaillement et matériel' },
      ],
    },
  ],
};

const TRAIL: ProgramTemplate = {
  id: 'trail_decouverte',
  name: 'Trail découverte',
  emoji: '⛰️',
  category: 'Trail',
  level: 'Intermédiaire',
  daysPerWeek: 4,
  goal: 'Endurance',
  sessionDuration: 75,
  description: 'Passer de la route au sentier. Dénivelé, descente technique et renforcement spécifique aux appuis instables.',
  sessions: [
    {
      id: 'tr_a', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Côtes', focus: 'Force',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Montées longues en côte', sets: 6, reps: '3 min', rest: 120, notes: 'Marche rapide autorisée si la pente monte' },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'tr_b', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Descente technique', focus: 'Appuis',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Descentes contrôlées', sets: 5, reps: '2 min', rest: 180, notes: 'Regard loin devant, pas courts' },
        { name: 'Proprioception unipodale', sets: 3, reps: '45 s par pied', rest: 30 },
      ],
    },
    {
      id: 'tr_c', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Renforcement', focus: 'Prévention',
      exercises: [
        { name: 'Squat bulgare', sets: 3, reps: '10 par jambe', rest: 90 },
        { name: 'Mollets excentriques', sets: 4, reps: '12', rest: 60 },
        { name: 'Gainage latéral', sets: 3, reps: '45 s par côté', rest: 45 },
      ],
    },
    {
      id: 'tr_d', dayOfWeek: 7, dayLabel: 'Dimanche', name: 'Sortie longue nature', focus: 'Volume',
      exercises: [
        { name: 'Sortie trail vallonnée', sets: 1, reps: '2 h', rest: 0, notes: 'Gérer à l effort, pas au chrono' },
      ],
    },
  ],
};

const TRI_S: ProgramTemplate = {
  id: 'tri_sprint',
  name: 'Triathlon format S',
  emoji: '🏊',
  category: 'Triathlon',
  level: 'Intermédiaire',
  daysPerWeek: 5,
  goal: 'Endurance',
  sessionDuration: 70,
  description: '750 m nage, 20 km vélo, 5 km course. Trois disciplines et surtout les enchaînements, qui font toute la difficulté.',
  sessions: [
    {
      id: 'ts_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Natation technique', focus: 'Technique',
      exercises: [
        { name: 'Échauffement crawl souple', sets: 1, reps: '400 m', rest: 0 },
        { name: 'Éducatifs (rattrapé, poings fermés)', sets: 4, reps: '50 m', rest: 30 },
        { name: 'Séries de 100 m à allure course', sets: 8, reps: '100 m', rest: 20 },
        { name: 'Retour au calme', sets: 1, reps: '200 m', rest: 0 },
      ],
    },
    {
      id: 'ts_b', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Vélo seuil', focus: 'Puissance',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Bloc au seuil', sets: 4, reps: '6 min', rest: 180 },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'ts_c', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Course VMA', focus: 'Vitesse',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Répétitions de 400 m', sets: 8, reps: '400 m', rest: 90 },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'ts_d', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Enchaînement vélo-course', focus: 'Spécifique',
      exercises: [
        { name: 'Vélo en endurance', sets: 1, reps: '45 min', rest: 0 },
        { name: 'Course immédiatement après le vélo', sets: 1, reps: '15 min', rest: 0, notes: 'Les 3 premières minutes sont toujours dures' },
      ],
    },
    {
      id: 'ts_e', dayOfWeek: 7, dayLabel: 'Dimanche', name: 'Natation endurance', focus: 'Volume',
      exercises: [
        { name: 'Crawl continu', sets: 1, reps: '1200 m', rest: 0 },
        { name: 'Séries de 200 m', sets: 4, reps: '200 m', rest: 45 },
      ],
    },
  ],
};

const TRI_703: ProgramTemplate = {
  id: 'tri_703',
  name: 'Ironman 70.3',
  emoji: '🔱',
  category: 'Triathlon',
  level: 'Avancé',
  daysPerWeek: 6,
  goal: 'Endurance',
  sessionDuration: 110,
  description: '1,9 km nage, 90 km vélo, 21 km course. Bloc de volume élevé : la récupération fait partie du programme.',
  sessions: [
    {
      id: 'i7_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Natation volume', focus: 'Endurance',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '400 m', rest: 0 },
        { name: 'Séries de 400 m à allure course', sets: 6, reps: '400 m', rest: 60 },
        { name: 'Retour au calme', sets: 1, reps: '300 m', rest: 0 },
      ],
    },
    {
      id: 'i7_b', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Vélo force', focus: 'Puissance',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '20 min', rest: 0 },
        { name: 'Bloc à faible cadence (55-60 tr/min)', sets: 5, reps: '5 min', rest: 180 },
        { name: 'Retour au calme', sets: 1, reps: '15 min', rest: 0 },
      ],
    },
    {
      id: 'i7_c', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Course seuil', focus: 'Résistance',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '20 min', rest: 0 },
        { name: 'Bloc au seuil', sets: 3, reps: '10 min', rest: 120 },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'i7_d', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Natation technique', focus: 'Technique',
      exercises: [
        { name: 'Éducatifs variés', sets: 6, reps: '50 m', rest: 30 },
        { name: 'Séries de 100 m rapides', sets: 10, reps: '100 m', rest: 20 },
      ],
    },
    {
      id: 'i7_e', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Vélo long + enchaînement', focus: 'Volume',
      exercises: [
        { name: 'Sortie vélo longue', sets: 1, reps: '3 h', rest: 0, notes: 'Tester la nutrition de course' },
        { name: 'Course après vélo', sets: 1, reps: '20 min', rest: 0 },
      ],
    },
    {
      id: 'i7_f', dayOfWeek: 7, dayLabel: 'Dimanche', name: 'Course longue', focus: 'Volume',
      exercises: [
        { name: 'Sortie longue', sets: 1, reps: '1 h 30', rest: 0 },
      ],
    },
  ],
};

const SWIM: ProgramTemplate = {
  id: 'swim_progression',
  name: 'Natation progression',
  emoji: '🌊',
  category: 'Natation',
  level: 'Débutant',
  daysPerWeek: 3,
  goal: 'Endurance',
  sessionDuration: 50,
  description: 'Nager 1000 m d affilée en crawl, proprement. La technique avant le volume : c est elle qui fait la vitesse.',
  sessions: [
    {
      id: 'sw_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Technique', focus: 'Éducatifs',
      exercises: [
        { name: 'Échauffement crawl', sets: 1, reps: '200 m', rest: 0 },
        { name: 'Battements avec planche', sets: 4, reps: '50 m', rest: 30 },
        { name: 'Éducatif rattrapé', sets: 4, reps: '50 m', rest: 30, notes: 'Une main attend l autre' },
        { name: 'Crawl souple', sets: 1, reps: '200 m', rest: 0 },
      ],
    },
    {
      id: 'sw_b', dayOfWeek: 3, dayLabel: 'Mercredi', name: 'Endurance', focus: 'Volume',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '200 m', rest: 0 },
        { name: 'Séries de 100 m', sets: 8, reps: '100 m', rest: 30, notes: 'Même temps sur chaque série' },
        { name: 'Retour au calme', sets: 1, reps: '100 m', rest: 0 },
      ],
    },
    {
      id: 'sw_c', dayOfWeek: 5, dayLabel: 'Vendredi', name: 'Vitesse', focus: 'Intensité',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '300 m', rest: 0 },
        { name: 'Sprints de 25 m', sets: 8, reps: '25 m', rest: 45 },
        { name: 'Crawl continu', sets: 1, reps: '400 m', rest: 0 },
      ],
    },
  ],
};

const BASKET: ProgramTemplate = {
  id: 'prepa_basket',
  name: 'Prépa basket',
  emoji: '🏀',
  category: 'Sport co',
  level: 'Intermédiaire',
  daysPerWeek: 4,
  goal: 'Performance',
  sessionDuration: 75,
  description: 'Détente, premier pas et capacité à réenchaîner les efforts. Ce qui se voit sur un terrain, pas en salle.',
  sessions: [
    {
      id: 'bk_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Explosivité', focus: 'Plyométrie',
      exercises: [
        { name: 'Pogo jumps', sets: 3, reps: '15', rest: 60, notes: 'Contact au sol le plus court possible' },
        { name: 'Box jump', sets: 4, reps: '5', rest: 90 },
        { name: 'Fentes sautées', sets: 3, reps: '10 par jambe', rest: 90 },
        { name: 'Squat', sets: 4, reps: '5', rest: 180 },
      ],
    },
    {
      id: 'bk_b', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Sprints répétés', focus: 'Capacité',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Sprints 20 m départ arrêté', sets: 12, reps: '20 m', rest: 25, notes: 'Chronométrer : arrêter si -10 % de perte' },
        { name: 'Gainage anti-rotation', sets: 3, reps: '12 par côté', rest: 45 },
      ],
    },
    {
      id: 'bk_c', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Changements de direction', focus: 'Appuis',
      exercises: [
        { name: 'Shuffle défensif en Z', sets: 6, reps: '15 m', rest: 60 },
        { name: 'Coupes à 45 degrés', sets: 8, reps: 'par côté', rest: 45 },
        { name: 'Décélération sur 5 m', sets: 6, reps: '5 m', rest: 60, notes: 'Réception silencieuse, genou dans l axe' },
        { name: 'Mollets et chevilles', sets: 3, reps: '15', rest: 60 },
      ],
    },
    {
      id: 'bk_d', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Force bas du corps', focus: 'Force',
      exercises: [
        { name: 'Soulevé de terre', sets: 4, reps: '5', rest: 180 },
        { name: 'Squat bulgare', sets: 3, reps: '8 par jambe', rest: 120 },
        { name: 'Hip thrust', sets: 4, reps: '10', rest: 90 },
        { name: 'Ischios machine', sets: 3, reps: '12', rest: 60 },
      ],
    },
  ],
};

const FOOT: ProgramTemplate = {
  id: 'prepa_foot',
  name: 'Prépa foot',
  emoji: '⚽',
  category: 'Sport co',
  level: 'Intermédiaire',
  daysPerWeek: 4,
  goal: 'Performance',
  sessionDuration: 70,
  description: 'Endurance intermittente, vitesse et prévention des ischios — la blessure numéro un du footballeur.',
  sessions: [
    {
      id: 'ft_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Intermittent', focus: 'Capacité',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: '30 s vite / 30 s trot', sets: 16, reps: '1 min', rest: 0, notes: 'Reproduit le rythme d un match' },
        { name: 'Retour au calme', sets: 1, reps: '10 min', rest: 0 },
      ],
    },
    {
      id: 'ft_b', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Vitesse', focus: 'Explosivité',
      exercises: [
        { name: 'Éducatifs et gammes', sets: 4, reps: '20 m', rest: 45 },
        { name: 'Sprints 30 m', sets: 8, reps: '30 m', rest: 120, notes: 'Récupération complète entre chaque' },
        { name: 'Départs en réaction', sets: 6, reps: '10 m', rest: 90 },
      ],
    },
    {
      id: 'ft_c', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Prévention ischios', focus: 'Prévention',
      exercises: [
        { name: 'Nordic hamstring', sets: 4, reps: '6', rest: 120, notes: 'Le geste le plus efficace contre la blessure ischio' },
        { name: 'Soulevé de terre jambes tendues', sets: 3, reps: '10', rest: 90 },
        { name: 'Copenhagen adducteurs', sets: 3, reps: '8 par côté', rest: 60 },
        { name: 'Gainage latéral', sets: 3, reps: '45 s par côté', rest: 45 },
      ],
    },
    {
      id: 'ft_d', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Force et puissance', focus: 'Force',
      exercises: [
        { name: 'Squat', sets: 4, reps: '6', rest: 180 },
        { name: 'Fentes sautées', sets: 3, reps: '8 par jambe', rest: 90 },
        { name: 'Mollets debout', sets: 4, reps: '15', rest: 60 },
      ],
    },
  ],
};

const HYROX: ProgramTemplate = {
  id: 'hyrox',
  name: 'Prépa Hyrox',
  emoji: '🔥',
  category: 'Hyrox',
  level: 'Avancé',
  daysPerWeek: 4,
  goal: 'Performance',
  sessionDuration: 80,
  description: '8 km de course entrecoupés de 8 ateliers. Le vrai enjeu : courir correctement avec les jambes déjà brûlées.',
  sessions: [
    {
      id: 'hx_a', dayOfWeek: 1, dayLabel: 'Lundi', name: 'Course + ateliers', focus: 'Spécifique',
      exercises: [
        { name: 'Course', sets: 1, reps: '1 km', rest: 0 },
        { name: 'Ski erg', sets: 1, reps: '1000 m', rest: 0 },
        { name: 'Course', sets: 1, reps: '1 km', rest: 0 },
        { name: 'Sled push', sets: 1, reps: '50 m', rest: 0 },
        { name: 'Course', sets: 1, reps: '1 km', rest: 0 },
        { name: 'Burpees broad jump', sets: 1, reps: '80 m', rest: 0 },
      ],
    },
    {
      id: 'hx_b', dayOfWeek: 2, dayLabel: 'Mardi', name: 'Force', focus: 'Puissance',
      exercises: [
        { name: 'Soulevé de terre', sets: 4, reps: '5', rest: 180 },
        { name: 'Squat avant', sets: 4, reps: '6', rest: 150 },
        { name: 'Fentes lestées', sets: 3, reps: '10 par jambe', rest: 90 },
        { name: 'Wall balls', sets: 4, reps: '20', rest: 90 },
      ],
    },
    {
      id: 'hx_c', dayOfWeek: 4, dayLabel: 'Jeudi', name: 'Compromis course', focus: 'Seuil',
      exercises: [
        { name: 'Échauffement', sets: 1, reps: '15 min', rest: 0 },
        { name: 'Bloc au seuil', sets: 4, reps: '6 min', rest: 90 },
        { name: 'Rameur entre chaque bloc', sets: 4, reps: '500 m', rest: 0 },
      ],
    },
    {
      id: 'hx_d', dayOfWeek: 6, dayLabel: 'Samedi', name: 'Simulation', focus: 'Test',
      exercises: [
        { name: 'Enchaînement course/atelier à intensité course', sets: 4, reps: '1 km + atelier', rest: 180, notes: 'Gérer, ne pas partir trop vite' },
      ],
    },
  ],
};

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
  // Multisport
  RUN_5K, RUN_10K, RUN_SEMI, RUN_MARA, TRAIL,
  TRI_S, TRI_703, SWIM,
  BASKET, FOOT, HYROX,
];

// Couleurs et icônes par catégorie — alignées sur la charte OR & NOIR
export const CATEGORY_META: Record<ProgramCategory, { color: string; icon: string }> = {
  'Full Body':    { color: '#3FB96B', icon: '⚡' },
  'Upper/Lower':  { color: '#5B9BE8', icon: '🔁' },
  'PPL':          { color: '#E8B84B', icon: '🔄' },
  'Brosplit':     { color: '#E8894B', icon: '💪' },
  'Cardio':       { color: '#E8546B', icon: '🏃' },
  'Course':       { color: '#4BC0E8', icon: '👟' },
  'Trail':        { color: '#8BC34A', icon: '⛰️' },
  'Triathlon':    { color: '#B983FF', icon: '🏊' },
  'Natation':     { color: '#4B9BE8', icon: '🌊' },
  'Sport co':     { color: '#FF8A4B', icon: '🏀' },
  'Hyrox':        { color: '#E8546B', icon: '🔥' },
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
  'Performance':    '#B983FF',
};
