import OpenAI from 'openai';
import { User, WorkoutSession, Meal, ChatMessage, MacroTotals } from '../types';
import * as Network from 'expo-network';
import { daysAgo } from './date';

// Clé lue depuis les variables d'environnement Expo (préfixe EXPO_PUBLIC_)
const ENV_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';

// ─── Mode proxy (recommandé pour distribuer l'app) ────────────────────────────
// Si un proxy est configuré, l'app appelle CE proxy au lieu d'OpenAI directement.
// La vraie clé OpenAI vit alors sur le serveur, jamais dans l'app. APP_TOKEN est
// un simple laissez-passer partagé app↔proxy (voir server/README.md).
const PROXY_URL = process.env.EXPO_PUBLIC_PROXY_URL ?? '';   // ex : https://fittrackia-proxy.xxx.workers.dev/v1
const APP_TOKEN = process.env.EXPO_PUBLIC_APP_TOKEN ?? '';
const PROXY_ON  = !!(PROXY_URL && APP_TOKEN);

// Modèle utilisé quand l'app parle en direct au fournisseur (clé perso dans
// les réglages). En mode proxy, le worker impose son propre modèle : changer
// de fournisseur ne demande donc aucun rebuild de l'app.
const MODEL = process.env.EXPO_PUBLIC_AI_MODEL ?? 'gpt-4o';

let _runtimeKey = '';
let _client: OpenAI | null = null;

// Appelé depuis les Paramètres et au démarrage si une clé est stockée
export function setRuntimeApiKey(key: string): void {
  _runtimeKey = key;
  _client = null; // force la réinitialisation du client
}

export function hasApiKey(): boolean {
  return PROXY_ON || !!(_runtimeKey || ENV_KEY);
}

// Valide le format d'une clé OpenAI (sk-... ou sk-proj-...) avant de l'accepter,
// pour éviter d'enregistrer une saisie erronée ou une chaîne arbitraire.
export function isValidApiKey(key: string): boolean {
  return /^sk-[A-Za-z0-9_-]{20,}$/.test(key.trim());
}

function getClient(): OpenAI | null {
  // Mode proxy : on pointe le SDK vers notre serveur et on envoie APP_TOKEN à la
  // place de la clé. Le proxy remplace ce token par la vraie clé côté serveur.
  if (PROXY_ON) {
    if (!_client) _client = new OpenAI({ baseURL: PROXY_URL, apiKey: APP_TOKEN, dangerouslyAllowBrowser: true });
    return _client;
  }
  const key = _runtimeKey || ENV_KEY;
  if (!key) return null;
  if (!_client) _client = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
  return _client;
}

// ─── Appels IA : gestion centralisée des erreurs ─────────────────────────────
// Sans ceci, une coupure réseau produisait une promesse rejetée non gérée et
// l'écran restait bloqué sur son indicateur de chargement, sans explication.

export class AIError extends Error {
  constructor(message: string) { super(message); this.name = 'AIError'; }
}

async function isOnline(): Promise<boolean> {
  try {
    const st = await Network.getNetworkStateAsync();
    return st.isConnected !== false && st.isInternetReachable !== false;
  } catch {
    return true;   // en cas de doute, on tente l'appel
  }
}

/** Enveloppe tout appel à l'API : vérifie la connexion et traduit les erreurs. */
async function callAI<T>(fn: () => Promise<T>): Promise<T> {
  if (!(await isOnline())) {
    throw new AIError("Pas de connexion internet. Tes données restent enregistrées — réessaie une fois connecté.");
  }
  try {
    return await fn();
  } catch (e: any) {
    const status = e?.status ?? e?.response?.status;
    if (status === 401) throw new AIError("Clé API refusée. Vérifie-la dans Réglages → Coach IA → Options avancées.");
    if (status === 429) throw new AIError("Trop de requêtes ou quota dépassé. Réessaie dans quelques minutes.");
    if (status >= 500)  throw new AIError("Le service IA est momentanément indisponible. Réessaie plus tard.");
    if (e?.name === 'AbortError' || /timeout|network/i.test(e?.message ?? '')) {
      throw new AIError("La connexion a été interrompue. Vérifie ton réseau et réessaie.");
    }
    throw new AIError("Le coach n'a pas pu répondre. Réessaie dans un instant.");
  }
}

// ─── Personas du Coach IA ─────────────────────────────────────────────────────

export type CoachPersona = 'motivateur' | 'scientifique' | 'bienveillant' | 'militaire';

const PERSONA_PROMPTS: Record<CoachPersona, string> = {
  motivateur:   "PERSONNALITÉ : Tu es un coach ultra-motivant. Utilise un ton énergique, des phrases courtes et percutantes, des emojis fréquents. Commence toujours par un encouragement.",
  scientifique: "PERSONNALITÉ : Tu es un coach basé sur la science. Cites des données précises, des pourcentages, des références. Ton neutre et analytique. Pas d'emojis.",
  bienveillant: "PERSONNALITÉ : Tu es un coach doux et empathique. Utilise un ton chaleureux, encourageant, bienveillant. Valide les émotions avant de conseiller.",
  militaire:    "PERSONNALITÉ : Tu es un coach militaire strict. Ton direct, sans pitié, exigeant. Pas de place pour les excuses. Discipline absolue.",
};

let _persona: CoachPersona = 'motivateur';
export function setCoachPersona(p: CoachPersona) { _persona = p; }
export function getCoachPersona(): CoachPersona { return _persona; }

// ─── Prompt système ────────────────────────────────────────────────────────────

function buildSystemPrompt(
  user: User,
  recentWorkouts: WorkoutSession[],
  recentMeals: Meal[],
  todayMacros: MacroTotals,
): string {
  const goalLabel = { weight_loss: 'perte de poids', muscle_gain: 'prise de masse', maintenance: 'maintien' }[user.goal];
  const actLabel  = { sedentary: 'sédentaire', light: 'légèrement actif', moderate: 'modérément actif', active: 'actif', very_active: 'très actif' }[user.activityLevel];

  // Calories et protéines par jour des 7 derniers jours
  const dayMap: Record<string, { cal: number; prot: number; hasWorkout: boolean }> = {};
  recentMeals.forEach(m => {
    if (!dayMap[m.date]) dayMap[m.date] = { cal: 0, prot: 0, hasWorkout: false };
    m.items.forEach(i => {
      dayMap[m.date].cal  += i.caloriesPer100g  * i.quantity / 100;
      dayMap[m.date].prot += i.proteinPer100g   * i.quantity / 100;
    });
  });
  recentWorkouts.forEach(w => {
    if (!dayMap[w.date]) dayMap[w.date] = { cal: 0, prot: 0, hasWorkout: false };
    dayMap[w.date].hasWorkout = true;
  });

  const correlationLines = Object.entries(dayMap).sort().map(([date, d]) => {
    const protOk = d.prot >= user.targetProtein * 0.8;
    const calOk  = d.cal  >= user.targetCalories * 0.9 && d.cal <= user.targetCalories * 1.15;
    const flags  = [];
    if (d.hasWorkout && !protOk) flags.push('⚠ protéines insuffisantes le jour de séance');
    if (d.hasWorkout && !calOk && d.cal < user.targetCalories * 0.9) flags.push('⚠ calories trop basses ce jour de séance');
    if (!d.hasWorkout && d.cal > user.targetCalories * 1.2) flags.push('surplus calorique sans sport');
    return `- ${date} : ${Math.round(d.cal)}kcal, P:${Math.round(d.prot)}g${d.hasWorkout ? ' 🏋️' : ''}${flags.length ? ' → ' + flags.join(', ') : ''}`;
  }).join('\n') || 'Pas de données corrélées.';

  const workoutSummary = recentWorkouts.slice(0, 7)
    .map(w => `- ${w.date} : ${w.name} (${w.duration}min, ${w.caloriesBurned}kcal brûlées)`)
    .join('\n') || 'Aucune séance récente.';

  const personaPrompt = PERSONA_PROMPTS[_persona];
  return `${personaPrompt}

Tu es FitCoach IA, un coach sportif et nutritionnel expert. Tu analyses la corrélation entre les séances de sport et la nutrition de l'utilisateur pour donner des conseils ultra-personnalisés.

Exemples de patterns à détecter et signaler : si l'utilisateur s'entraîne beaucoup mais mange peu de protéines → dis-le clairement. Si les calories sont insuffisantes les jours de séance → signale-le. Si le volume d'entraînement est trop élevé par rapport à la récupération → avertis. Si les macros sont déséquilibrées par rapport à l'objectif → corrige.

Ton ton est direct, expert, motivant — jamais condescendant. Réponds en français, 3 paragraphes maximum.

=== PROFIL ===
${user.name} | ${user.gender === 'male' ? 'Homme' : 'Femme'} | ${user.age}ans | ${user.height}cm | ${user.weight}kg
Objectif : ${goalLabel} | Niveau : ${actLabel}
TDEE : ${user.tdee}kcal/j → Cible : ${user.targetCalories}kcal/j
Macros cible : P${user.targetProtein}g / G${user.targetCarbs}g / L${user.targetFat}g

=== AUJOURD'HUI ===
${Math.round(todayMacros.calories)}kcal | P:${Math.round(todayMacros.protein)}g G:${Math.round(todayMacros.carbs)}g L:${Math.round(todayMacros.fat)}g

=== SÉANCES 7J ===
${workoutSummary}

=== CORRÉLATION SPORT / NUTRITION ===
${correlationLines}`;
}

// ─── Envoi de message ─────────────────────────────────────────────────────────

const DEMO_RESPONSES = [
  "Salut ! Le coach IA n'est pas encore activé sur cet appareil 👋 En attendant, tu peux tout suivre : séances, repas, poids et progrès sont enregistrés normalement.",
  "Le coach personnalisé n'est pas activé pour l'instant. Tu peux l'activer dans Réglages → Coach IA → Options avancées. D'ici là, continue à enregistrer tes données, je les garde bien au chaud.",
  "Mode aperçu : je ne peux pas encore analyser tes données en détail. Rends-toi dans Réglages → Coach IA pour activer les conseils personnalisés.",
];
let demoIdx = 0;

export async function sendCoachMessage(
  userMessage: string,
  history: ChatMessage[],
  user: User,
  recentWorkouts: WorkoutSession[],
  recentMeals: Meal[],
  todayMacros: MacroTotals,
): Promise<string> {
  const client = getClient();

  // Mode démo si pas de clé
  if (!client) {
    await new Promise(r => setTimeout(r, 800));
    return DEMO_RESPONSES[demoIdx++ % DEMO_RESPONSES.length];
  }

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: buildSystemPrompt(user, recentWorkouts, recentMeals, todayMacros) },
    ...history.slice(-12).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages,
    max_tokens: 400,
    temperature: 0.75,
  }));

  return res.choices[0]?.message?.content ?? "Désolé, je n'ai pas pu répondre.";
}

// ─── Calculs Harris-Benedict ──────────────────────────────────────────────────

const ACTIVITY_FACTORS: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export function computeTDEE(
  gender: 'male' | 'female',
  weight: number,
  height: number,
  age: number,
  activity: string,
): number {
  // Harris-Benedict révisé
  const bmr = gender === 'male'
    ? 88.362 + (13.397 * weight) + (4.799 * height) - (5.677 * age)
    : 447.593 + (9.247 * weight) + (3.098 * height) - (4.330 * age);
  return Math.round(bmr * (ACTIVITY_FACTORS[activity] ?? 1.55));
}

export function computeTargetCalories(tdee: number, goal: string): number {
  if (goal === 'weight_loss')  return tdee - 500;
  if (goal === 'muscle_gain')  return tdee + 300;
  return tdee;
}

export function computeMacros(
  calories: number,
  weight: number,
): { protein: number; fat: number; carbs: number } {
  const protein = Math.round(weight * 2);
  const fat     = Math.round((calories * 0.25) / 9);
  const carbs   = Math.round((calories - protein * 4 - fat * 9) / 4);
  return { protein, fat, carbs: Math.max(carbs, 0) };
}

// ─── Génération plan repas 7 jours ────────────────────────────────────────────

export async function generateMealPlan(user: import('../types').User): Promise<string> {
  const client = getClient();
  const goalLabel = { weight_loss: 'perte de poids', muscle_gain: 'prise de masse', maintenance: 'maintien' }[user.goal];

  const prompt = `Génère un plan repas complet pour 7 jours pour ${user.name}.
Profil : ${user.gender === 'male' ? 'Homme' : 'Femme'}, ${user.age}ans, ${user.weight}kg, objectif ${goalLabel}.
Cible : ${user.targetCalories}kcal/j | P:${user.targetProtein}g | G:${user.targetCarbs}g | L:${user.targetFat}g.

Format requis pour chaque jour :
LUNDI
• Petit-déjeuner : [description] — XXXkcal, PXXg GXXg LXXg
• Déjeuner : [description] — XXXkcal, PXXg GXXg LXXg
• Dîner : [description] — XXXkcal, PXXg GXXg LXXg
• Collation : [description] — XXXkcal, PXXg GXXg LXXg
Total jour : XXXXkcal

Réponds directement avec le plan sans introduction. Sois précis sur les quantités (grammes).`;

  if (!client) {
    return `PLAN REPAS 7 JOURS (mode démo)

LUNDI
• Petit-déjeuner : Flocons d'avoine 60g + lait 200ml + banane — 420kcal, P18g G65g L8g
• Déjeuner : Poulet grillé 180g + riz 150g + brocoli — 520kcal, P52g G55g L8g
• Dîner : Saumon 150g + patate douce 200g + épinards — 480kcal, P38g G45g L14g
• Collation : Fromage blanc 0% 200g + amandes 20g — 220kcal, P22g G12g L10g
Total jour : 1640kcal

[Aperçu — active le coach IA dans Réglages → Coach IA pour un plan personnalisé selon tes objectifs]`;
  }

  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.7,
  }));
  return res.choices[0]?.message?.content ?? 'Erreur lors de la génération.';
}

// ─── Génération programme sportif personnalisé ────────────────────────────────

export async function generateCustomProgram(params: {
  daysPerWeek: number;
  level: string;
  goal: string;
  equipment: string;
  name: string;
}): Promise<string> {
  const client = getClient();

  const prompt = `Génère un programme sportif complet personnalisé pour ${params.name}.
Paramètres :
- Jours disponibles : ${params.daysPerWeek}/semaine
- Niveau : ${params.level}
- Objectif : ${params.goal}
- Équipement : ${params.equipment}

Format requis :
PROGRAMME [NOM] — [X]j/semaine
[Description courte]

JOUR 1 — [Nom de la séance]
• [Exercice] : [X]×[reps], repos [X]s
[...]

Génère toutes les séances avec les exercices, séries, reps et temps de repos. Sois précis et complet.`;

  if (!client) {
    return `PROGRAMME PERSONNALISÉ (mode démo — ${params.daysPerWeek}j/sem, ${params.level})

JOUR 1 — Full Body A
• Squat barre : 4×8, repos 120s
• Développé couché : 4×8, repos 120s
• Rowing barre : 4×8, repos 120s
• Développé militaire : 3×10, repos 90s
• Curl haltères : 3×12, repos 60s

[Aperçu — active le coach IA dans Réglages → Coach IA pour un programme entièrement personnalisé]`;
  }

  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.75,
  }));
  return res.choices[0]?.message?.content ?? 'Erreur lors de la génération.';
}

// ─── Génération bilan mensuel ─────────────────────────────────────────────────

/**
 * Génère un programme STRUCTURÉ (et non de la prose) : séances, exercices,
 * séries, répétitions, repos. Le résultat est directement démarrable et
 * suivable comme un programme de la bibliothèque.
 */
export async function generateStructuredProgram(params: {
  daysPerWeek: number; level: string; goal: string; equipment: string; name: string;
}): Promise<import('../constants/programs').ProgramTemplate | null> {
  const client = getClient();
  if (!client) return null;

  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages: [{
      role: 'user',
      content: `Crée un programme de musculation pour ${params.name} : niveau ${params.level}, objectif ${params.goal}, ${params.daysPerWeek} séances par semaine, matériel : ${params.equipment}.
Réponds UNIQUEMENT avec un objet JSON, sans texte autour, à ce format exact :
{"name":"Nom court du programme","emoji":"💪","category":"Full Body","level":"${params.level}","daysPerWeek":${params.daysPerWeek},"goal":"${params.goal}","sessionDuration":60,"description":"Deux phrases expliquant la logique du programme.","sessions":[{"dayOfWeek":1,"name":"Nom de la séance","focus":"Poussée","exercises":[{"name":"Développé couché barre","sets":4,"reps":"8-10","rest":120,"notes":"Optionnel"}]}]}
Contraintes : "category" parmi Full Body, Upper/Lower, PPL, Brosplit, Cardio. "dayOfWeek" entre 1 (lundi) et 7. Exactement ${params.daysPerWeek} séances, 5 à 8 exercices chacune, "rest" en secondes.`,
    }],
    max_tokens: 2500, temperature: 0.4,
  }));

  return parseProgram(res.choices[0]?.message?.content ?? '', params);
}

const DAY_FR = ['', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
const CATEGORIES = ['Full Body', 'Upper/Lower', 'PPL', 'Brosplit', 'Cardio'];

/** Assainit la sortie du modèle : on ne fait confiance à aucune valeur reçue. */
function parseProgram(
  text: string,
  params: { daysPerWeek: number; level: string; goal: string },
): import('../constants/programs').ProgramTemplate | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  let raw: any;
  try { raw = JSON.parse(m[0]); } catch { return null; }

  const int = (v: unknown, min: number, max: number, fallback: number) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.min(Math.max(n, min), max) : fallback;
  };
  const str = (v: unknown, max: number, fallback: string) =>
    typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : fallback;

  const sessions = (Array.isArray(raw.sessions) ? raw.sessions : [])
    .slice(0, 7)
    .flatMap((sn: any, i: number) => {
      const exercises = (Array.isArray(sn?.exercises) ? sn.exercises : [])
        .slice(0, 10)
        .flatMap((ex: any) => {
          const name = str(ex?.name, 60, '');
          if (!name) return [];
          return [{
            name,
            sets: int(ex?.sets, 1, 10, 3),
            reps: str(ex?.reps, 12, '10'),
            rest: int(ex?.rest, 15, 300, 90),
            ...(str(ex?.notes, 90, '') ? { notes: str(ex.notes, 90, '') } : {}),
          }];
        });
      if (exercises.length === 0) return [];
      const day = int(sn?.dayOfWeek, 1, 7, ((i * 2) % 7) + 1);
      return [{
        id: `ai_s${i}`,
        dayOfWeek: day as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        dayLabel: DAY_FR[day],
        name: str(sn?.name, 40, `Séance ${i + 1}`),
        focus: str(sn?.focus, 20, 'Général'),
        exercises,
      }];
    });

  if (sessions.length === 0) return null;

  const category = CATEGORIES.includes(raw?.category) ? raw.category : 'Full Body';
  return {
    id: `ai_${Date.now()}`,
    name: str(raw?.name, 50, `Programme ${params.goal}`),
    emoji: str(raw?.emoji, 4, '✨'),
    category: category as any,
    level: params.level as any,
    daysPerWeek: sessions.length,
    goal: params.goal as any,
    sessionDuration: int(raw?.sessionDuration, 15, 180, 60),
    description: str(raw?.description, 300, 'Programme généré sur mesure par le coach IA.'),
    sessions,
  };
}

export async function generateMonthlyMessage(user: import('../types').User, stats: {
  avgCalories: number;
  totalWorkouts: number;
  weightChange?: number;
}): Promise<string> {
  const client = getClient();
  if (!client) {
    const trend = stats.weightChange && stats.weightChange < 0 ? 'en baisse 📉' : stats.weightChange && stats.weightChange > 0 ? 'en hausse 📈' : 'stable';
    return `Beau travail ce mois-ci ${user.name} ! ${stats.totalWorkouts} séances complétées, ${Math.round(stats.avgCalories)}kcal en moyenne par jour. Poids ${trend}. Continue sur cette lancée ! 💪`;
  }

  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages: [{
      role: 'user',
      content: `Message de bilan mensuel motivant pour ${user.name} (objectif : ${user.goal}). Stats : ${stats.totalWorkouts} séances, ${Math.round(stats.avgCalories)}kcal/j en moyenne, poids ${stats.weightChange !== undefined ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange.toFixed(1)}kg` : 'non renseigné'}. 2 phrases max, direct et positif.`,
    }],
    max_tokens: 100,
    temperature: 0.8,
  }));
  return res.choices[0]?.message?.content ?? 'Excellent travail ce mois-ci !';
}

// ─── Estimation macros d'un plat (Mode Restaurant) ───────────────────────────

export interface EstimatedItem {
  name: string; portionG: number; caloriesPer100g: number;
  proteinPer100g: number; carbsPer100g: number; fatPer100g: number;
}

/**
 * Décompose un repas décrit en langage naturel ("burger frites coca") en
 * aliments distincts avec portions réalistes. Utilisé par le mode Restaurant
 * et le fallback IA de la recherche d'aliments.
 */
export async function estimateMealItems(description: string): Promise<EstimatedItem[]> {
  const client = getClient();
  if (!client) {
    await new Promise(r => setTimeout(r, 600));
    return [{ name: description, portionG: 300, caloriesPer100g: 150, proteinPer100g: 12, carbsPer100g: 18, fatPer100g: 5 }];
  }
  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages: [{
      role: 'user',
      content: `Décompose ce repas en aliments distincts avec des portions réalistes (contexte : restaurant/fait maison en France) : "${description}".
Réponds UNIQUEMENT avec un tableau JSON, sans autre texte, au format exact :
[{"name":"Burger bœuf","portionG":250,"caloriesPer100g":250,"proteinPer100g":13,"carbsPer100g":20,"fatPer100g":13}]
Maximum 6 aliments. Les macros sont pour 100 g.`,
    }],
    max_tokens: 500, temperature: 0.3,
  }));
  return parseEstimatedItems(res.choices[0]?.message?.content ?? '');
}

/** Parse et assainit un tableau JSON d'aliments estimés — bornes plausibles, rien d'aberrant. */
function parseEstimatedItems(text: string): EstimatedItem[] {
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];
  let raw: unknown;
  try { raw = JSON.parse(jsonMatch[0]); } catch { return []; }
  if (!Array.isArray(raw)) return [];
  const num = (v: unknown, max: number): number => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.min(Math.max(n, 0), max) : 0;
  };
  return raw.slice(0, 6).flatMap((it: any): EstimatedItem[] => {
    const name = typeof it?.name === 'string' ? it.name.slice(0, 80).trim() : '';
    if (!name) return [];
    return [{
      name,
      portionG:        num(it.portionG, 5000) || 100,
      caloriesPer100g: num(it.caloriesPer100g, 900),
      proteinPer100g:  num(it.proteinPer100g, 100),
      carbsPer100g:    num(it.carbsPer100g, 100),
      fatPer100g:      num(it.fatPer100g, 100),
    }];
  });
}

/**
 * Analyse une PHOTO de repas (jpeg base64) et estime les aliments visibles
 * avec leurs portions. Même contrat de sortie qu'estimateMealItems.
 */
export async function estimateMealFromPhoto(base64Jpeg: string): Promise<EstimatedItem[]> {
  const client = getClient();
  if (!client) {
    await new Promise(r => setTimeout(r, 600));
    return [{ name: 'Plat (démo — configure la clé IA)', portionG: 300, caloriesPer100g: 150, proteinPer100g: 12, carbsPer100g: 18, fatPer100g: 5 }];
  }
  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'text',
          text: `Identifie les aliments visibles sur cette photo de repas et estime la portion de chacun en te basant sur les proportions de l'assiette (contexte : France).
Réponds UNIQUEMENT avec un tableau JSON, sans autre texte, au format exact :
[{"name":"Poulet rôti","portionG":150,"caloriesPer100g":190,"proteinPer100g":27,"carbsPer100g":0,"fatPer100g":9}]
Maximum 6 aliments. Les macros sont pour 100 g. Si aucune nourriture n'est visible, réponds [].`,
        },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Jpeg}`, detail: 'low' } },
      ],
    }],
    max_tokens: 500, temperature: 0.3,
  }));
  return parseEstimatedItems(res.choices[0]?.message?.content ?? '');
}

// ─── Génération Meal Prep 7 jours + liste de courses ─────────────────────────

export async function generateMealPrepWithShopping(user: import('../types').User): Promise<{ plan: string; shopping: string }> {
  const client = getClient();
  const prompt = `Génère un plan de meal prep pour 7 jours pour ${user.name}.
Objectifs : ${user.targetCalories} kcal/j | P:${user.targetProtein}g | G:${user.targetCarbs}g | L:${user.targetFat}g.
Fournis :
1. PLAN REPAS (format : Lun/Mar/Mer/Jeu/Ven/Sam/Dim avec petit-déj, déjeuner, dîner, collation)
2. LISTE DE COURSES (ingrédients regroupés par rayon)

Utilise des aliments simples et courants. Sois précis sur les quantités.`;

  if (!client) {
    return {
      plan: `PLAN MEAL PREP (mode démo)

LUNDI–MERCREDI
• Petit-déjeuner : Porridge avoine 60g + lait 200ml + banane — 450kcal
• Déjeuner : Riz 200g + Poulet 150g + Brocoli 150g — 500kcal
• Dîner : Pâtes 200g + Thon 100g + Tomate — 480kcal
• Collation : Yaourt 150g + 20g amandes — 220kcal

[Aperçu — active le coach IA dans Réglages → Coach IA pour un plan personnalisé]`,
      shopping: `LISTE DE COURSES (mode démo)

FÉCULENTS : riz, pâtes, flocons d'avoine
PROTÉINES : poulet, thon en boîte, œufs
LÉGUMES : brocoli, tomates, épinards
LAITIERS : lait, yaourt nature
FRUITS : bananes, pommes
DIVERS : amandes, huile d'olive`,
    };
  }
  const res = await callAI(() => client.chat.completions.create({ model: MODEL, messages: [{ role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.7 }));
  const content = res.choices[0]?.message?.content ?? '';
  const shoppingIdx = content.toLowerCase().indexOf('liste de courses');
  if (shoppingIdx > -1) {
    return { plan: content.slice(0, shoppingIdx).trim(), shopping: content.slice(shoppingIdx).trim() };
  }
  return { plan: content, shopping: '' };
}

// ─── Analyse carences nutritionnelles ────────────────────────────────────────

export async function analyzeNutritionDeficiencies(
  meals: import('../types').Meal[],
  user: import('../types').User,
): Promise<string> {
  const client = getClient();

  const since = daysAgo(7);
  const dayMap: Record<string, { cal: number; prot: number; carb: number; fat: number }> = {};
  meals.filter(m => m.date >= since).forEach(m => {
    if (!dayMap[m.date]) dayMap[m.date] = { cal: 0, prot: 0, carb: 0, fat: 0 };
    m.items.forEach(i => {
      const r = i.quantity / 100;
      dayMap[m.date].cal  += i.caloriesPer100g  * r;
      dayMap[m.date].prot += i.proteinPer100g   * r;
      dayMap[m.date].carb += i.carbsPer100g     * r;
      dayMap[m.date].fat  += i.fatPer100g       * r;
    });
  });
  const days = Object.values(dayMap);

  if (!client || days.length === 0) {
    const avgCal  = days.length ? Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length) : 0;
    const avgProt = days.length ? Math.round(days.reduce((s, d) => s + d.prot, 0) / days.length) : 0;
    const targetProt = user.targetProtein;
    const lines = [`📊 ANALYSE NUTRITIONNELLE — 7 DERNIERS JOURS\n`];
    if (avgCal === 0) { return 'Pas assez de données. Enregistre tes repas pendant au moins 3 jours.'; }
    lines.push(`✅ Points positifs :`);
    if (avgProt >= targetProt * 0.9) lines.push(`• Apport en protéines dans l'objectif (${avgProt}g/j)`);
    if (avgCal >= user.targetCalories * 0.85) lines.push(`• Apport calorique suffisant (${avgCal} kcal/j en moyenne)`);
    lines.push(`\n⚠️ Points à améliorer :`);
    if (avgProt < targetProt * 0.8) lines.push(`• Protéines insuffisantes : ${avgProt}g/j vs objectif ${targetProt}g/j`);
    if (days.filter(d => d.cal < 1200).length > 0) lines.push(`• ${days.filter(d => d.cal < 1200).length} jour(s) trop restrictifs (< 1200 kcal)`);
    lines.push(`\n💡 Recommandations :`);
    if (avgProt < targetProt * 0.8) lines.push(`• Ajoute une source de protéines à chaque repas (œufs, poulet, yaourt)`);
    return lines.join('\n');
  }

  const avgCal  = Math.round(days.reduce((s, d) => s + d.cal, 0) / days.length);
  const avgProt = Math.round(days.reduce((s, d) => s + d.prot, 0) / days.length);
  const avgCarb = Math.round(days.reduce((s, d) => s + d.carb, 0) / days.length);
  const avgFat  = Math.round(days.reduce((s, d) => s + d.fat, 0) / days.length);
  const lowCalDays = days.filter(d => d.cal < 1200).length;

  const res = await callAI(() => client.chat.completions.create({
    model: MODEL,
    messages: [{ role: 'user', content: `Analyse ces données nutritionnelles de 7 jours pour ${user.name} (objectif : ${user.targetCalories} kcal/j, ${user.targetProtein}g prot, ${user.targetCarbs}g glucides, ${user.targetFat}g lipides) :
Moyennes : ${avgCal} kcal/j, ${avgProt}g prot/j, ${avgCarb}g glucides/j, ${avgFat}g lipides/j. Jours < 1200 kcal : ${lowCalDays}.

Structure ta réponse avec : ✅ Points positifs, ⚠️ Points à améliorer, 💡 Recommandations concrètes. Max 200 mots. Réponds en français.` }],
    max_tokens: 300, temperature: 0.6,
  }));
  return res.choices[0]?.message?.content ?? 'Impossible d\'analyser.';
}
