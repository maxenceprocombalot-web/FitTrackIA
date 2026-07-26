import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { encryptString, decryptString, isEncrypted, hasDataKey, deleteDataKey } from './crypto';
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

// ─── Lecture / écriture CHIFFRÉES ─────────────────────────────────────────────
// Toutes les données personnelles passent par ici. Le contenu est chiffré
// (AES-256, clé dans le Keychain liée à l'appareil — voir services/crypto.ts).
// La lecture accepte aussi l'ancien format en clair et le migre à la volée :
// aucune donnée existante n'est perdue lors de la mise à jour.

// ⚠️ COUPE-CIRCUIT ANTI-ÉCRASEMENT
// Si des données chiffrées existent mais sont illisibles (clé absente après une
// restauration iCloud, Keychain verrouillé, panne transitoire), une lecture
// renverrait « vide » — et la première écriture écraserait définitivement tout
// l'historique. On bloque donc TOUTE écriture tant que ce cas n'est pas résolu.
let _dataUnreadable = false;

export const isDataUnreadable = (): boolean => _dataUnreadable;

function markUnreadable() {
  if (!_dataUnreadable) _dataUnreadable = true;
}

export class StorageLockedError extends Error {
  constructor() {
    super('Données illisibles : écriture bloquée pour éviter toute perte.');
    this.name = 'StorageLockedError';
  }
}

export async function setSecure(key: string, value: string): Promise<void> {
  if (_dataUnreadable) throw new StorageLockedError();
  await AsyncStorage.setItem(key, await encryptString(value));
}

export async function getSecure(key: string): Promise<string | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;                    // vraiment aucune donnée

  if (!isEncrypted(raw)) {
    // Donnée héritée en clair → on la rechiffre (migration), sans bloquer la lecture
    if (!_dataUnreadable) {
      try { await AsyncStorage.setItem(key, await encryptString(raw)); } catch { /* non bloquant */ }
    }
    return raw;
  }

  // Donnée chiffrée : la clé doit exister. On ne la recrée JAMAIS ici — générer
  // une clé neuve rendrait l'ancien contenu définitivement indéchiffrable.
  if (!(await hasDataKey())) { markUnreadable(); return null; }

  const plain = await decryptString(raw);
  if (plain === null) { markUnreadable(); return null; }
  return plain;
}

// ─── File d'écriture séquentielle (une par clé) ───────────────────────────────
// Les mises à jour sont des lire-modifier-écrire ; sans sérialisation, deux
// appels concurrents (ex. deux repas ajoutés coup sur coup) peuvent s'écraser.
const _queues = new Map<string, Promise<unknown>>();

function enqueue<T>(key: string, task: () => Promise<T>): Promise<T> {
  const prev = _queues.get(key) ?? Promise.resolve();
  const next = prev.then(task, task);              // s'exécute même après un échec
  _queues.set(key, next.catch(() => undefined));
  return next;
}

/** Lire-modifier-écrire atomique sur une clé (protégé par la file). */
async function mutate<T>(key: string, updater: (current: T[]) => T[]): Promise<void> {
  return enqueue(key, async () => {
    const current = (await load<T[]>(key)) ?? [];
    await save(key, updater(current));
  });
}

async function save<T>(key: string, data: T): Promise<void> {
  await setSecure(key, JSON.stringify(data));
}

async function load<T>(key: string): Promise<T | null> {
  const raw = await getSecure(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;   // valeur illisible → on ne crashe pas
  }
}

// ─── Utilisateur ──────────────────────────────────────────────────────────────

export const saveUser = (u: User) => save(K.USER, u);
export const loadUser = ()        => load<User>(K.USER);

// ─── Séances ──────────────────────────────────────────────────────────────────

export async function loadWorkouts(): Promise<WorkoutSession[]> {
  return (await load<WorkoutSession[]>(K.WORKOUTS)) ?? [];
}

export async function saveWorkout(w: WorkoutSession): Promise<void> {
  await mutate<WorkoutSession>(K.WORKOUTS, list => {
    const idx = list.findIndex(x => x.id === w.id);
    if (idx >= 0) list[idx] = w; else list.unshift(w);
    return list;
  });
}

export async function deleteWorkout(id: string): Promise<void> {
  await mutate<WorkoutSession>(K.WORKOUTS, list => list.filter(w => w.id !== id));
}

// ─── Repas ────────────────────────────────────────────────────────────────────

export async function loadMeals(): Promise<Meal[]> {
  return (await load<Meal[]>(K.MEALS)) ?? [];
}

export async function saveMeal(m: Meal): Promise<void> {
  await mutate<Meal>(K.MEALS, list => {
    const idx = list.findIndex(x => x.id === m.id);
    if (idx >= 0) list[idx] = m; else list.unshift(m);
    return list;
  });
}

export async function deleteMeal(id: string): Promise<void> {
  await mutate<Meal>(K.MEALS, list => list.filter(m => m.id !== id));
}

// ─── Poids ────────────────────────────────────────────────────────────────────

export async function loadWeights(): Promise<WeightEntry[]> {
  return (await load<WeightEntry[]>(K.WEIGHTS)) ?? [];
}

export async function saveWeight(e: WeightEntry): Promise<void> {
  await mutate<WeightEntry>(K.WEIGHTS, list => {
    const idx = list.findIndex(x => x.date === e.date);
    if (idx >= 0) list[idx] = e; else list.push(e);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  });
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
  await mutate<PersonalRecord>(K.PRS, list => {
    const idx = list.findIndex(x => x.exerciseId === pr.exerciseId);
    if (idx >= 0) list[idx] = pr; else list.push(pr);
    return list;
  });
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
  await mutate<FavoriteMeal>(K.FAVORITES, list => {
    const idx = list.findIndex(x => x.id === f.id);
    if (idx >= 0) list[idx] = f; else list.unshift(f);
    return list;
  });
}

export async function deleteFavorite(id: string): Promise<void> {
  await mutate<FavoriteMeal>(K.FAVORITES, list => list.filter(f => f.id !== id));
}

// ─── Hydratation ──────────────────────────────────────────────────────────────

export async function loadWaterEntry(date: string): Promise<WaterEntry> {
  const all = (await load<WaterEntry[]>(K.WATER)) ?? [];
  return all.find(e => e.date === date) ?? { date, ml: 0 };
}

export async function saveWaterEntry(e: WaterEntry): Promise<void> {
  await mutate<WaterEntry>(K.WATER, all => {
    const idx = all.findIndex(x => x.date === e.date);
    if (idx >= 0) all[idx] = e; else all.push(e);
    all.sort((a, b) => a.date.localeCompare(b.date));
    return all.slice(-30);   // ne garder que les 30 derniers jours
  });
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
  await mutate<SavedPlan>(K.SAVED_PLANS, list => {
    const idx = list.findIndex(x => x.id === p.id);
    if (idx >= 0) list[idx] = p; else list.unshift(p);
    return list;
  });
}

export async function deletePlan(id: string): Promise<void> {
  await mutate<SavedPlan>(K.SAVED_PLANS, list => list.filter(p => p.id !== id || p.isPredefined));
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
  await mutate<MonthlySummary>(K.MONTHLY, list => {
    const idx = list.findIndex(x => x.month === s.month);
    if (idx >= 0) list[idx] = s; else list.unshift(s);
    return list.slice(0, 24);
  });
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
  // Efface TOUTES les clés de l'app (y compris recettes, photos, conversations,
  // mensurations, défis hebdo, jeûne…) et pas seulement la liste K, puis la clé
  // de chiffrement elle-même. Sans ça, des données personnelles survivaient à la
  // « suppression de toutes mes données » (RGPD).
  const all = await AsyncStorage.getAllKeys();
  const mine = all.filter(k => k.startsWith('@fit_'));
  if (mine.length) await AsyncStorage.multiRemove(mine);
  await deleteDataKey();
  _dataUnreadable = false;   // repartir d'un état sain
}

/**
 * Récupération quand les données sont devenues illisibles (clé perdue après une
 * restauration sur un autre iPhone). Efface le contenu chiffré irrécupérable et
 * réarme l'app. À n'appeler qu'après confirmation explicite de l'utilisateur.
 */
export async function resetUnreadableData(): Promise<void> {
  await deleteAllData();
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
  await mutate<import('../types').Recipe>('@fit_recipes', list => {
    const idx = list.findIndex(x => x.id === r.id);
    if (idx >= 0) list[idx] = r; else list.push(r);
    return list;
  });
}
export async function deleteRecipe(id: string): Promise<void> {
  await mutate<import('../types').Recipe>('@fit_recipes', list => list.filter(r => r.id !== id));
}

// ─── Photos de progression ────────────────────────────────────────────────────

export async function loadProgressPhotos(): Promise<{ id: string; uri: string; date: string }[]> {
  const raw = await getSecure('@fit_progress_photos');
  return raw ? JSON.parse(raw) : [];
}
export async function saveProgressPhoto(photo: { id: string; uri: string; date: string }): Promise<void> {
  await mutate<{ id: string; uri: string; date: string }>('@fit_progress_photos', list => [...list, photo]);
}
export async function deleteProgressPhoto(id: string): Promise<void> {
  await mutate<{ id: string; uri: string; date: string }>('@fit_progress_photos', list => list.filter(p => p.id !== id));
}

// ─── Historique conversations Coach IA ────────────────────────────────────────

export interface StoredConversation {
  id: string;
  date: string;
  title: string;
  messages: import('../types').ChatMessage[];
}
export async function loadConversations(): Promise<StoredConversation[]> {
  const raw = await getSecure('@fit_conversations');
  return raw ? JSON.parse(raw) : [];
}
export async function saveConversation(conv: StoredConversation): Promise<void> {
  await mutate<StoredConversation>('@fit_conversations',
    list => [conv, ...list.filter(c => c.id !== conv.id)].slice(0, 30));
}

// ─── Mensurations ─────────────────────────────────────────────────────────────

export async function loadMeasurements(): Promise<import('../types').BodyMeasurement[]> {
  return (await load<import('../types').BodyMeasurement[]>('@fit_measurements')) ?? [];
}
export async function saveMeasurement(m: import('../types').BodyMeasurement): Promise<void> {
  await mutate<import('../types').BodyMeasurement>('@fit_measurements', list => {
    const idx = list.findIndex(x => x.date === m.date);
    if (idx >= 0) list[idx] = m; else list.push(m);
    return list.sort((a, b) => a.date.localeCompare(b.date));
  });
}

// ─── Défis hebdomadaires ──────────────────────────────────────────────────────

export async function loadChallenges(weekKey: string): Promise<import('../types').WeeklyChallenge[]> {
  const raw = await getSecure(`@fit_challenges_${weekKey}`);
  return raw ? JSON.parse(raw) : [];
}
export async function saveChallenges(weekKey: string, challenges: import('../types').WeeklyChallenge[]): Promise<void> {
  await setSecure(`@fit_challenges_${weekKey}`, JSON.stringify(challenges));
}

// ─── Jeûne intermittent ───────────────────────────────────────────────────────

export async function loadFasting(): Promise<import('../types').FastingConfig | null> {
  const raw = await getSecure('@fit_fasting');
  return raw ? JSON.parse(raw) : null;
}
export async function saveFasting(f: import('../types').FastingConfig | null): Promise<void> {
  if (f === null) await AsyncStorage.removeItem('@fit_fasting');
  else await setSecure('@fit_fasting', JSON.stringify(f));
}
