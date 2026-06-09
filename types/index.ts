// ─── Utilisateur ──────────────────────────────────────────────────────────────

export type Gender = 'male' | 'female';
export type Goal = 'weight_loss' | 'muscle_gain' | 'maintenance';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface User {
  id: string;
  name: string;
  gender: Gender;
  age: number;
  height: number;        // cm
  weight: number;        // kg
  targetWeight?: number; // kg — objectif de poids
  waterGoalMl?: number;  // ml/j — objectif hydratation (défaut 2000)
  goal: Goal;
  activityLevel: ActivityLevel;
  tdee: number;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  onboardingDone: boolean;
  gdprAcceptedAt?: string; // ISO date — consentement RGPD obligatoire
  createdAt: string;
}

// ─── Sport ────────────────────────────────────────────────────────────────────

export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'yoga' | 'running' | 'other';

export interface SetLog {
  reps: number;
  weight: number;
  completed: boolean;
}

export interface ExerciseLog {
  id: string;
  exerciseId: string;
  name: string;
  category: string;
  sets: SetLog[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  name: string;
  type: WorkoutType;
  duration: number;
  caloriesBurned: number;
  exercises: ExerciseLog[];
  notes?: string;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  weight: number;
  reps: number;
  date: string;
  previousWeight?: number;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  quantity: number;
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface Meal {
  id: string;
  date: string;
  type: MealType;
  items: FoodItem[];
}

export interface MacroTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

// ─── Repas favoris ────────────────────────────────────────────────────────────

export interface FavoriteMeal {
  id: string;
  name: string;         // ex : "Mon petit-déj habituel"
  items: FoodItem[];
  mealType: MealType;
  createdAt: string;
}

// ─── Hydratation ──────────────────────────────────────────────────────────────

export interface WaterEntry {
  date: string; // YYYY-MM-DD
  ml: number;
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export interface StreakData {
  current: number;
  best: number;
  lastWorkoutDate: string;
  jokerUsedMonth?: string; // "YYYY-MM" — 1 joker par mois
}

// ─── Plans sauvegardés ────────────────────────────────────────────────────────

export type SavedPlanType = 'sport' | 'nutrition' | 'custom';

export interface SavedPlan {
  id: string;
  type: SavedPlanType;
  title: string;
  content: string; // texte brut du plan
  date: string;
  isPredefined?: boolean; // plans non supprimables
  programId?: string;     // lien vers constants/programs si applicable
}

// ─── Bilan mensuel ────────────────────────────────────────────────────────────

export interface MonthlySummary {
  month: string; // "YYYY-MM"
  avgCalories: number;
  totalWorkouts: number;
  startWeight?: number;
  endWeight?: number;
  weightChange?: number;
  totalVolume: number;         // kg totaux soulevés
  bestPR?: { exerciseName: string; weight: number; reps: number };
  coachMessage: string;
  viewedAt?: string;
}

// ─── Programmes ───────────────────────────────────────────────────────────────

export interface ActiveProgram {
  programId: string;
  startDate: string;
}

// ─── Progrès ──────────────────────────────────────────────────────────────────

export interface WeightEntry {
  date: string;
  weight: number;
}

// ─── Préférences notifications ────────────────────────────────────────────────

export interface NotifPrefs {
  meals: boolean;
  workout: boolean;
  weekly: boolean;
}

// ─── Coach IA ─────────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

// ─── Recettes ─────────────────────────────────────────────────────────────────

export interface RecipeIngredient {
  name: string;
  quantity: number;       // grammes
  caloriesPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
}

export interface Recipe {
  id: string;
  name: string;
  emoji: string;
  ingredients: RecipeIngredient[];
  servings: number;       // portions
  isPredefined?: boolean;
}

// ─── Mensurations ─────────────────────────────────────────────────────────────

export interface BodyMeasurement {
  date: string;
  waist?: number;   // tour de taille cm
  arm?: number;     // tour de bras cm
  thigh?: number;   // tour de cuisse cm
  chest?: number;   // tour de poitrine cm
}
