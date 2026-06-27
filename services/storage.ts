import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import {
  User, WorkoutSession, Meal, WeightEntry,
  ChatMessage, PersonalRecord, ActiveProgram,
  FavoriteMeal, WaterEntry, StreakData,
  SavedPlan, MonthlySummary, NotifPrefs,
} from '../types';

// ─── Clés de stockage ──────────────────────────────────────────────────────────

const K = {
  USER:            '@fit_user',
  WORKOUTS:        '@fit_workouts',
  MEALS:           '@fit_meals',
  WEIGHTS:         '@fit_weights',
  CHAT:            '@fit_chat',
  PRS:             '@fit_prs',
  ACTIVE_PROGRAM:  '@fit_active_program',
  FAVORITES:       '@fit_favorites',
  WATER:           '@fit_water',
  STREAK:          '@fit_streak',
  SAVED_PLANS:     '@fit_plans',
  RECENT_FOODS:    '@fit_recent_foods',
  MONTHLY:         '@fit_monthly',
};

// ─── Utilitaires génériques ────────────────────────────────────────────────────

async function save<T>(key: string, data: T): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

async function load<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

// ─── Utilisateur ──────────────────────────────────────────────────────────────

export const saveUser = (u: User) => save(K.USER, u);
export const loadUser = ()        => load<User>(K.USER);

// ─── Séances ──────────────────────────────────────────────────────────────────

export async function loadWorkouts(): Promise<WorkoutSession[]> {
  return (await load<WorkoutSession[]>(K.WORKOUTS)) ?? [];
}

export async function saveWorkout(w: WorkoutSession): Promise<void> {
  const list = await loadWorkouts();
  const idx  = list.findIndex(x => x.id === w.id);
  if (idx >= 0) list[idx] = w; else list.unshift(w);
  await save(K.WORKOUTS, list);
}

export async function deleteWorkout(id: string): Promise<void> {
  const list = await loadWorkouts();
  await save(K.WORKOUTS, list.filter(w => w.id !== id));
}

// ─── Repas ────────────────────────────────────────────────────────────────────

export async function loadMeals(): Promise<Meal[]> {
  return (await load<Meal[]>(K.MEALS)) ?? [];
}

export async function saveMeal(m: Meal): Promise<void> {
  const list = await loadMeals();
  const idx  = list.findIndex(x => x.id === m.id);
  if (idx >= 0) list[idx] = m; else list.unshift(m);
  await save(K.MEALS, list);
}

export async function deleteMeal(id: string): Promise<void> {
  const list = await loadMeals();
  await save(K.MEALS, list.filter(m => m.id !== id));
}

// ─── Poids ────────────────────────────────────────────────────────────────────

export async function loadWeights(): Promise<WeightEntry[]> {
  return (await load<WeightEntry[]>(K.WEIGHTS)) ?? [];
}

export async function saveWeight(e: WeightEntry): Promise<void> {
  const list = await loadWeights();
  const idx  = list.findIndex(x => x.date === e.date);
  if (idx >= 0) list[idx] = e; else list.push(e);
  list.sort((a, b) => a.date.localeCompare(b.date));
  await save(K.WEIGHTS, list);
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export async function loadChat(): Promise<ChatMessage[]> {
  return (await load<ChatMessage[]>(K.CHAT)) ?? [];
}

export async function saveChat(msgs: ChatMessage[]): Promise<void> {
  await save(K.CHAT, msgs.slice(-120));
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export async function loadPRs(): Promise<PersonalRecord[]> {
  return (await load<PersonalRecord[]>(K.PRS)) ?? [];
}

export async function savePR(pr: PersonalRecord): Promise<void> {
  const list = await loadPRs();
  const idx  = list.findIndex(x => x.exerciseId === pr.exerciseId);
  if (idx >= 0) list[idx] = pr; else list.push(pr);
  await save(K.PRS, list);
}

// ─── Programme actif ──────────────────────────────────────────────────────────

export const loadActiveProgram  = () => load<ActiveProgram>(K.ACTIVE_PROGRAM);
export const saveActiveProgram  = (ap: ActiveProgram) => save(K.ACTIVE_PROGRAM, ap);
export const clearActiveProgram = () => AsyncStorage.removeItem(K.ACTIVE_PROGRAM);

// ─── Repas favoris ────────────────────────────────────────────────────────────

export async function loadFavorites(): Promise<FavoriteMeal[]> {
  return (await load<FavoriteMeal[]>(K.FAVORITES)) ?? [];
}

export async function saveFavorite(f: FavoriteMeal): Promise<void> {
  const list = await loadFavorites();
  const idx  = list.findIndex(x => x.id === f.id);
  if (idx >= 0) list[idx] = f; else list.unshift(f);
  await save(K.FAVORITES, list);
}

export async function deleteFavorite(id: string): Promise<void> {
  const list = await loadFavorites();
  await save(K.FAVORITES, list.filter(f => f.id !== id));
}

// ─── Hydratation ──────────────────────────────────────────────────────────────

export async function loadWaterEntry(date: string): Promise<WaterEntry> {
  const all = (await load<WaterEntry[]>(K.WATER)) ?? [];
  return all.find(e => e.date === date) ?? { date, ml: 0 };
}

export async function saveWaterEntry(e: WaterEntry): Promise<void> {
  const all = (await load<WaterEntry[]>(K.WATER)) ?? [];
  // Ne garder que les 30 derniers jours
  const idx = all.findIndex(x => x.date === e.date);
  if (idx >= 0) all[idx] = e; else all.push(e);
  all.sort((a, b) => a.date.localeCompare(b.date));
  await save(K.WATER, all.slice(-30));
}

// ─── Streak ───────────────────────────────────────────────────────────────────

export async function loadStreak(): Promise<StreakData> {
  return (await load<StreakData>(K.STREAK)) ?? { current: 0, best: 0, lastWorkoutDate: '' };
}

export const saveStreak = (s: StreakData) => save(K.STREAK, s);

// ─── Plans sauvegardés ────────────────────────────────────────────────────────

export async function loadSavedPlans(): Promise<SavedPlan[]> {
  return (await load<SavedPlan[]>(K.SAVED_PLANS)) ?? [];
}

export async function savePlan(p: SavedPlan): Promise<void> {
  const list = await loadSavedPlans();
  const idx  = list.findIndex(x => x.id === p.id);
  if (idx >= 0) list[idx] = p; else list.unshift(p);
  await save(K.SAVED_PLANS, list);
}

export async function deletePlan(id: string): Promise<void> {
  const list = await loadSavedPlans();
  await save(K.SAVED_PLANS, list.filter(p => p.id !== id || p.isPredefined));
}

// ─── Aliments récents (10 derniers) ───────────────────────────────────────────

export async function loadRecentFoods(): Promise<import('../types').FoodItem[]> {
  return (await load<import('../types').FoodItem[]>(K.RECENT_FOODS)) ?? [];
}

export async function pushRecentFood(item: import('../types').FoodItem): Promise<void> {
  const list  = await loadRecentFoods();
  const dedup = list.filter(f => f.name !== item.name);
  await save(K.RECENT_FOODS, [item, ...dedup].slice(0, 10));
}

// ─── Bilan mensuel ────────────────────────────────────────────────────────────

export async function loadMonthlySummaries(): Promise<MonthlySummary[]> {
  return (await load<MonthlySummary[]>(K.MONTHLY)) ?? [];
}

export async function saveMonthlySummary(s: MonthlySummary): Promise<void> {
  const list = await loadMonthlySummaries();
  const idx  = list.findIndex(x => x.month === s.month);
  if (idx >= 0) list[idx] = s; else list.unshift(s);
  await save(K.MONTHLY, list.slice(0, 24));
}

// ─── Clé API OpenAI (stockage CHIFFRÉ) ────────────────────────────────────────
// La clé est stockée dans le Keychain (iOS) / Keystore (Android) via
// expo-secure-store, chiffrée au repos. Sur le web (pas de SecureStore), on
// retombe sur AsyncStorage. Une migration déplace toute ancienne clé stockée en
// clair dans AsyncStorage vers le coffre chiffré.

const API_KEY_LEGACY = '@fit_openai_key'; // ancien emplacement (clair)
const API_KEY_SECURE = 'fit_openai_key';  // coffre chiffré (clés alphanum. only)

async function secureGet(): Promise<string | null> {
  if (Platform.OS === 'web') return AsyncStorage.getItem(API_KEY_SECURE);
  try { return await SecureStore.getItemAsync(API_KEY_SECURE); } catch { return null; }
}
async function secureSet(key: string): Promise<void> {
  if (Platform.OS === 'web') { await AsyncStorage.setItem(API_KEY_SECURE, key); return; }
  await SecureStore.setItemAsync(API_KEY_SECURE, key);
}
async function secureDel(): Promise<void> {
  if (Platform.OS === 'web') { await AsyncStorage.removeItem(API_KEY_SECURE); return; }
  try { await SecureStore.deleteItemAsync(API_KEY_SECURE); } catch { /* déjà absent */ }
}

export async function loadApiKey(): Promise<string | null> {
  // Migration : ancienne clé en clair dans AsyncStorage → coffre chiffré.
  const legacy = await AsyncStorage.getItem(API_KEY_LEGACY);
  if (legacy) {
    await secureSet(legacy).catch(() => {});
    await AsyncStorage.removeItem(API_KEY_LEGACY);
    return legacy;
  }
  return secureGet();
}

export const saveApiKey  = (key: string) => secureSet(key);
export async function clearApiKey(): Promise<void> {
  await secureDel();
  await AsyncStorage.removeItem(API_KEY_LEGACY);
}

// ─── Préférences de notifications ─────────────────────────────────────────────

const NOTIF_PREFS_KEY = '@fit_notif_prefs';

export async function loadNotifPrefs(): Promise<NotifPrefs> {
  const raw = await AsyncStorage.getItem(NOTIF_PREFS_KEY);
  return raw ? JSON.parse(raw) : { meals: true, workout: true, weekly: true };
}

export const saveNotifPrefs = (p: NotifPrefs) =>
  AsyncStorage.setItem(NOTIF_PREFS_KEY, JSON.stringify(p));

// ─── Suppression de toutes les données (RGPD) ─────────────────────────────────

export async function deleteAllData(): Promise<void> {
  await AsyncStorage.multiRemove(Object.values(K));
}

// ─── Réinitialisation onboarding (dev uniquement) ─────────────────────────────

export async function resetOnboardingData(): Promise<void> {
  await AsyncStorage.multiRemove([K.USER, '@fit_tutorial_done']);
}

// ─── Tutoriel interactif ──────────────────────────────────────────────────────

const TUTORIAL_KEY = '@fit_tutorial_done';
export const loadTutorialDone = async (): Promise<boolean> => {
  const v = await AsyncStorage.getItem(TUTORIAL_KEY);
  return v === 'true';
};
export const saveTutorialDone = async (): Promise<void> => {
  await AsyncStorage.setItem(TUTORIAL_KEY, 'true');
};

// ─── Bilan hebdomadaire ──────────────────────────────────────────────────────

export const loadWeeklyBilanShown = (weekKey: string) => AsyncStorage.getItem(`@fit_weekly_bilan_${weekKey}`);
export const saveWeeklyBilanShown = (weekKey: string) => AsyncStorage.setItem(`@fit_weekly_bilan_${weekKey}`, 'true');

// ─── Utilitaire date ──────────────────────────────────────────────────────────
// Réexporté depuis services/date pour garder une API stable tout en utilisant
// des dates en heure LOCALE (et non UTC — voir services/date.ts).

export { today, thisMonth, yesterday, daysAgo, localISO } from './date';

// ─── Recettes ─────────────────────────────────────────────────────────────────

export async function loadRecipes(): Promise<import('../types').Recipe[]> {
  return (await load<import('../types').Recipe[]>('@fit_recipes')) ?? [];
}
export async function saveRecipe(r: import('../types').Recipe): Promise<void> {
  const list = await loadRecipes();
  const idx  = list.findIndex(x => x.id === r.id);
  if (idx >= 0) list[idx] = r; else list.push(r);
  await AsyncStorage.setItem('@fit_recipes', JSON.stringify(list));
}
export async function deleteRecipe(id: string): Promise<void> {
  const list = await loadRecipes();
  await AsyncStorage.setItem('@fit_recipes', JSON.stringify(list.filter(r => r.id !== id)));
}

// ─── Photos de progression ────────────────────────────────────────────────────

export async function loadProgressPhotos(): Promise<{ id: string; uri: string; date: string }[]> {
  const raw = await AsyncStorage.getItem('@fit_progress_photos');
  return raw ? JSON.parse(raw) : [];
}
export async function saveProgressPhoto(photo: { id: string; uri: string; date: string }): Promise<void> {
  const list = await loadProgressPhotos();
  await AsyncStorage.setItem('@fit_progress_photos', JSON.stringify([...list, photo]));
}
export async function deleteProgressPhoto(id: string): Promise<void> {
  const list = await loadProgressPhotos();
  await AsyncStorage.setItem('@fit_progress_photos', JSON.stringify(list.filter(p => p.id !== id)));
}

// ─── Historique conversations Coach IA ────────────────────────────────────────

export interface StoredConversation {
  id: string;
  date: string;
  title: string;
  messages: import('../types').ChatMessage[];
}
export async function loadConversations(): Promise<StoredConversation[]> {
  const raw = await AsyncStorage.getItem('@fit_conversations');
  return raw ? JSON.parse(raw) : [];
}
export async function saveConversation(conv: StoredConversation): Promise<void> {
  const list = await loadConversations();
  const trimmed = [conv, ...list.filter(c => c.id !== conv.id)].slice(0, 30);
  await AsyncStorage.setItem('@fit_conversations', JSON.stringify(trimmed));
}

// ─── Mensurations ─────────────────────────────────────────────────────────────

export async function loadMeasurements(): Promise<import('../types').BodyMeasurement[]> {
  return (await load<import('../types').BodyMeasurement[]>('@fit_measurements')) ?? [];
}
export async function saveMeasurement(m: import('../types').BodyMeasurement): Promise<void> {
  const list = await loadMeasurements();
  const idx  = list.findIndex(x => x.date === m.date);
  if (idx >= 0) list[idx] = m; else list.push(m);
  list.sort((a, b) => a.date.localeCompare(b.date));
  await AsyncStorage.setItem('@fit_measurements', JSON.stringify(list));
}

// ─── Défis hebdomadaires ──────────────────────────────────────────────────────

export async function loadChallenges(weekKey: string): Promise<import('../types').WeeklyChallenge[]> {
  const raw = await AsyncStorage.getItem(`@fit_challenges_${weekKey}`);
  return raw ? JSON.parse(raw) : [];
}
export async function saveChallenges(weekKey: string, challenges: import('../types').WeeklyChallenge[]): Promise<void> {
  await AsyncStorage.setItem(`@fit_challenges_${weekKey}`, JSON.stringify(challenges));
}

// ─── Jeûne intermittent ───────────────────────────────────────────────────────

export async function loadFasting(): Promise<import('../types').FastingConfig | null> {
  const raw = await AsyncStorage.getItem('@fit_fasting');
  return raw ? JSON.parse(raw) : null;
}
export async function saveFasting(f: import('../types').FastingConfig | null): Promise<void> {
  if (f === null) await AsyncStorage.removeItem('@fit_fasting');
  else await AsyncStorage.setItem('@fit_fasting', JSON.stringify(f));
}
