export interface BadgeDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  condition: string; // description humaine de la condition
}

export const BADGES: BadgeDef[] = [
  { id: 'b01', emoji: '🥇', title: 'Première séance',      description: 'Enregistre ta toute première séance',       condition: 'workouts >= 1' },
  { id: 'b02', emoji: '🔥', title: 'En feu !',             description: '7 jours de streak consécutifs',             condition: 'streak.best >= 7' },
  { id: 'b03', emoji: '💪', title: 'Premier PR',           description: 'Bats un record personnel pour la 1ère fois', condition: 'prs >= 1' },
  { id: 'b04', emoji: '🏆', title: 'Champion',             description: '10 records personnels différents',           condition: 'prs >= 10' },
  { id: 'b05', emoji: '📊', title: 'Traceur assidu',       description: '30 jours de repas enregistrés',             condition: 'mealDays >= 30' },
  { id: 'b06', emoji: '⚡', title: 'Centurion',            description: '100 séances complétées',                     condition: 'workouts >= 100' },
  { id: 'b07', emoji: '🎯', title: 'Dans la cible',        description: 'Objectif calorique atteint 7 jours de suite', condition: 'calStreak >= 7' },
  { id: 'b08', emoji: '💧', title: 'Aquaman',              description: '2L d\'eau 7 jours de suite',                 condition: 'waterStreak >= 7' },
  { id: 'b09', emoji: '🧘', title: 'Polyvalent',           description: '5 types de séances différents utilisés',    condition: 'workoutTypes >= 5' },
  { id: 'b10', emoji: '🌟', title: 'Légende',              description: '365 jours depuis ton inscription',           condition: 'daysSince >= 365' },
  { id: 'b11', emoji: '🏃', title: 'Cardio King',          description: '10 séances de cardio ou course',            condition: 'cardioWorkouts >= 10' },
  { id: 'b12', emoji: '🥗', title: 'Nutriman',             description: '100 repas enregistrés',                     condition: 'totalMeals >= 100' },
  { id: 'b13', emoji: '⚖️', title: 'Peseur régulier',     description: '7 pesées enregistrées',                     condition: 'weights >= 7' },
  { id: 'b14', emoji: '🦾', title: 'Powerlifter',          description: '10 000 kg soulevés au total',               condition: 'totalVolume >= 10000' },
  { id: 'b15', emoji: '📅', title: 'Régularité',           description: '4 séances par semaine pendant 4 semaines',  condition: 'weeklyConsistency' },
  { id: 'b16', emoji: '🌊', title: 'Hydraté',             description: 'Objectif eau atteint 14 jours',              condition: 'waterDays >= 14' },
  { id: 'b17', emoji: '🔬', title: 'Coach addict',        description: '20 messages envoyés au Coach IA',            condition: 'chatMessages >= 20' },
  { id: 'b18', emoji: '🏅', title: 'All-Star',             description: 'Débloquer 10 autres badges',                 condition: 'badges >= 10' },
  { id: 'b19', emoji: '📈', title: 'Progression',         description: '5 kg perdus ou gagnés vers l\'objectif',     condition: 'weightProgress >= 5' },
  { id: 'b20', emoji: '🎖️', title: 'Marathonien',        description: '50 séances de course ou cardio',             condition: 'cardioWorkouts >= 50' },
];
