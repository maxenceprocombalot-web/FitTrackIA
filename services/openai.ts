import OpenAI from 'openai';
import { User, WorkoutSession, Meal, ChatMessage, MacroTotals } from '../types';

// Clé lue depuis les variables d'environnement Expo (préfixe EXPO_PUBLIC_)
const ENV_KEY = process.env.EXPO_PUBLIC_OPENAI_KEY ?? '';

let _runtimeKey = '';
let _client: OpenAI | null = null;

// Appelé depuis les Paramètres et au démarrage si une clé est stockée
export function setRuntimeApiKey(key: string): void {
  _runtimeKey = key;
  _client = null; // force la réinitialisation du client
}

export function hasApiKey(): boolean {
  return !!(_runtimeKey || ENV_KEY);
}

function getClient(): OpenAI | null {
  const key = _runtimeKey || ENV_KEY;
  if (!key) return null;
  if (!_client) _client = new OpenAI({ apiKey: key, dangerouslyAllowBrowser: true });
  return _client;
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
  "Salut ! Je suis en mode démo 👋 Pour activer le vrai coach GPT-4o, ajoute ta clé OpenAI dans un fichier `.env.local` avec `EXPO_PUBLIC_OPENAI_KEY=sk-...` et relance l'app.",
  "Mode démo actif — mes réponses sont simulées. Configure `EXPO_PUBLIC_OPENAI_KEY` pour des conseils personnalisés basés sur tes vraies données.",
  "Je suis ton FitCoach en mode aperçu ! Tes données sont bien là, mais je ne peux pas encore les analyser sans clé API. Ajoute `EXPO_PUBLIC_OPENAI_KEY` dans ton `.env.local`.",
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

  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages,
    max_tokens: 400,
    temperature: 0.75,
  });

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

[Configure EXPO_PUBLIC_OPENAI_KEY pour un vrai plan personnalisé GPT-4o]`;
  }

  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 1500,
    temperature: 0.7,
  });
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

[Configure EXPO_PUBLIC_OPENAI_KEY pour un programme GPT-4o entièrement personnalisé]`;
  }

  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: 2000,
    temperature: 0.75,
  });
  return res.choices[0]?.message?.content ?? 'Erreur lors de la génération.';
}

// ─── Génération bilan mensuel ─────────────────────────────────────────────────

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

  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: `Message de bilan mensuel motivant pour ${user.name} (objectif : ${user.goal}). Stats : ${stats.totalWorkouts} séances, ${Math.round(stats.avgCalories)}kcal/j en moyenne, poids ${stats.weightChange !== undefined ? `${stats.weightChange > 0 ? '+' : ''}${stats.weightChange.toFixed(1)}kg` : 'non renseigné'}. 2 phrases max, direct et positif.`,
    }],
    max_tokens: 100,
    temperature: 0.8,
  });
  return res.choices[0]?.message?.content ?? 'Excellent travail ce mois-ci !';
}

// ─── Estimation macros d'un plat (Mode Restaurant) ───────────────────────────

export async function estimateDishMacros(dishName: string): Promise<{
  name: string; portionG: number; caloriesPer100g: number;
  proteinPer100g: number; carbsPer100g: number; fatPer100g: number;
} | null> {
  const client = getClient();
  if (!client) {
    await new Promise(r => setTimeout(r, 600));
    return { name: dishName, portionG: 300, caloriesPer100g: 150, proteinPer100g: 12, carbsPer100g: 18, fatPer100g: 5 };
  }
  try {
    const res = await client.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: `Estime les macronutriments pour le plat suivant : "${dishName}". Réponds UNIQUEMENT en JSON avec ce format exact, sans aucun autre texte : {"name":"${dishName}","portionG":300,"caloriesPer100g":150,"proteinPer100g":12,"carbsPer100g":18,"fatPer100g":5}` }],
      max_tokens: 150, temperature: 0.3,
    });
    const text = res.choices[0]?.message?.content ?? '';
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (!jsonMatch) return null;
    return JSON.parse(jsonMatch[0]);
  } catch { return null; }
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

[Configure EXPO_PUBLIC_OPENAI_KEY pour un plan personnalisé]`,
      shopping: `LISTE DE COURSES (mode démo)

FÉCULENTS : riz, pâtes, flocons d'avoine
PROTÉINES : poulet, thon en boîte, œufs
LÉGUMES : brocoli, tomates, épinards
LAITIERS : lait, yaourt nature
FRUITS : bananes, pommes
DIVERS : amandes, huile d'olive`,
    };
  }
  const res = await client.chat.completions.create({ model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.7 });
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

  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  const since = cutoff.toISOString().split('T')[0];
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

  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: `Analyse ces données nutritionnelles de 7 jours pour ${user.name} (objectif : ${user.targetCalories} kcal/j, ${user.targetProtein}g prot, ${user.targetCarbs}g glucides, ${user.targetFat}g lipides) :
Moyennes : ${avgCal} kcal/j, ${avgProt}g prot/j, ${avgCarb}g glucides/j, ${avgFat}g lipides/j. Jours < 1200 kcal : ${lowCalDays}.

Structure ta réponse avec : ✅ Points positifs, ⚠️ Points à améliorer, 💡 Recommandations concrètes. Max 200 mots. Réponds en français.` }],
    max_tokens: 300, temperature: 0.6,
  });
  return res.choices[0]?.message?.content ?? 'Impossible d\'analyser.';
}
