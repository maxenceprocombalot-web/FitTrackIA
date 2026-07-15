import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert, Modal, FlatList,
} from 'react-native';
import AnimatedScreen from '../../components/ui/AnimatedScreen';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { sendCoachMessage, generateMealPlan, analyzeNutritionDeficiencies, setCoachPersona, getCoachPersona } from '../../services/openai';
import { ChatMessage, FoodItem, Meal, MealType, SavedPlan } from '../../types';
import { Colors, R, Sp, Fs, Fw, Fonts , tapSlop } from '../../constants/theme';
import Button from '../../components/ui/Button';
import * as storage from '../../services/storage';
import { StoredConversation, loadConversations, saveConversation } from '../../services/storage';
import { today, yesterday, daysAgo, localISO } from '../../services/date';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERSONA_LABELS: Record<string, string> = { motivateur: '🔥 Motivateur', scientifique: '📊 Scientifique', bienveillant: '🤝 Bienveillant', militaire: '💂 Militaire' };

const WEEKLY_ANALYSIS_PROMPT = "Analyse ma semaine complète : corrèle mes séances de sport avec ma nutrition, identifie les points forts et les axes d'amélioration, et donne-moi 3 recommandations concrètes pour la semaine prochaine.";

const QUICK_QUESTIONS = [
  'Analyse ma nutrition de cette semaine',
  'Programme optimal pour mon objectif',
  'Conseils récupération musculaire',
  'Comment booster mes performances ?',
];

const DEMO_MODE = !process.env.EXPO_PUBLIC_OPENAI_KEY;

// Détecte si la réponse contient un plan/programme (longueur minimale)
function looksLikePlan(content: string): boolean {
  return content.length > 180;
}

// Détecte si la réponse est un plan repas 7 jours structuré
function looksLikeMealPlan(content: string): boolean {
  const days = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI'];
  return days.filter(d => content.includes(d)).length >= 3;
}

// ─── Import du plan repas dans la nutrition de la semaine ─────────────────────

async function applyMealPlanToWeek(content: string, addMeal: (m: Meal) => Promise<void>, existingMeals: Meal[]): Promise<number> {
  const DAY_NAMES  = ['LUNDI', 'MARDI', 'MERCREDI', 'JEUDI', 'VENDREDI', 'SAMEDI', 'DIMANCHE'];
  const MEAL_TYPES: [string, MealType][] = [
    ['Petit-déjeuner', 'breakfast'],
    ['Déjeuner', 'lunch'],
    ['Dîner', 'dinner'],
    ['Collation', 'snack'],
  ];

  // Calculer le lundi de la semaine courante
  const today     = new Date();
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
  const monday    = new Date(today);
  monday.setDate(today.getDate() - dayOfWeek + 1);

  const lines = content.split('\n');
  let currentDayIdx = -1;
  let mealsAdded    = 0;

  // Tracking local pour éviter les doublons sur le snapshot existingMeals
  const localAdded: Meal[] = [];

  for (const line of lines) {
    const trimmed  = line.trim().toUpperCase();
    const dayIdx   = DAY_NAMES.findIndex(d => trimmed.startsWith(d));
    if (dayIdx >= 0) { currentDayIdx = dayIdx; continue; }
    if (currentDayIdx < 0) continue;

    for (const [mealName, mealType] of MEAL_TYPES) {
      if (!line.toLowerCase().includes(mealName.toLowerCase())) continue;

      // Extraction des calories (format "XXXkcal" ou "XXX kcal")
      const calMatch  = line.match(/(\d{2,4})\s*kcal/i);
      const totalCal  = calMatch ? parseInt(calMatch[1]) : 400;

      // Description entre ':' et '—' ou fin de ligne
      const descMatch = line.match(/:\s*(.+?)(?:\s*[—\-]|$)/);
      const desc      = descMatch ? descMatch[1].trim().slice(0, 80) : mealName;

      // Date du jour correspondant
      const date = new Date(monday);
      date.setDate(monday.getDate() + currentDayIdx);
      const dateStr = localISO(date);

      // Aliment placeholder : quantity=totalCal, cal_per_100g=100 → affichage = totalCal kcal
      const item: FoodItem = {
        id:               `plan_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name:             desc,
        quantity:         totalCal,
        caloriesPer100g:  100,
        proteinPer100g:   0,
        carbsPer100g:     0,
        fatPer100g:       0,
      };

      // Cherche dans le snapshot ET dans les repas déjà ajoutés lors de cette boucle
      const allKnown = [...existingMeals, ...localAdded];
      const existing = allKnown.find(m => m.date === dateStr && m.type === mealType);
      const meal: Meal = existing
        ? { ...existing, items: [...existing.items, item] }
        : { id: `${Date.now()}_${Math.random().toString(36).slice(2)}`, date: dateStr, type: mealType, items: [item] };

      await addMeal(meal);
      // Mise à jour du tracking local pour les prochaines itérations
      const localIdx = localAdded.findIndex(m => m.id === meal.id);
      if (localIdx >= 0) localAdded[localIdx] = meal;
      else localAdded.push(meal);

      mealsAdded++;
      break;
    }
  }

  return mealsAdded;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function CoachScreen() {
  const store     = useAppStore();
  const scrollRef = useRef<ScrollView>(null);
  const [input,              setInput]             = useState('');
  const [loading,            setLoading]           = useState(false);
  const [generatingMealPlan, setGeneratingMealPlan] = useState(false);
  const [applyingPlan,       setApplyingPlan]      = useState<string | null>(null); // messageId en cours d'application
  const [showHistory,        setShowHistory]       = useState(false);
  const [analyzingNutrition, setAnalyzingNutrition] = useState(false);
  const [currentPersona,     setCurrentPersona]    = useState(getCoachPersona());

  useEffect(() => {
    AsyncStorage.getItem('@fit_coach_persona').then(v => {
      if (v) { setCoachPersona(v as any); setCurrentPersona(v as any); }
    });
  }, []);

  // ── Suggestions contextuelles ──────────────────────────────────────────────
  const contextualQuestions = useMemo(() => {
    const questions: string[] = [];
    const today = new Date();

    // 1. Pas de séance depuis 3+ jours
    const lastWorkoutDate = store.workouts[0]?.date;
    if (lastWorkoutDate) {
      const daysSince = Math.floor((today.getTime() - new Date(lastWorkoutDate + 'T12:00').getTime()) / 86400000);
      if (daysSince >= 3) {
        questions.push(`Tu n'as pas fait de séance depuis ${daysSince} jours — que faire ?`);
      }
    } else {
      questions.push('Je commence — par où démarrer mon programme ?');
    }

    // 2. Calories trop basses cette semaine (< 80% de l'objectif en moyenne)
    if (store.user) {
      const since = daysAgo(7);
      const dayMap: Record<string, number> = {};
      store.meals.filter(m => m.date >= since).forEach(m => {
        const cal = m.items.reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
        dayMap[m.date] = (dayMap[m.date] ?? 0) + cal;
      });
      const calVals = Object.values(dayMap);
      if (calVals.length >= 3) {
        const avgCal = calVals.reduce((a, b) => a + b, 0) / calVals.length;
        if (avgCal < store.user.targetCalories * 0.8) {
          questions.push('Mes calories sont trop basses cette semaine — comment corriger ?');
        }
      }
    }

    // 3. PR battu cette semaine
    const weekAgoStr = daysAgo(7);
    const recentPR = store.prs.find(p => p.date >= weekAgoStr);
    if (recentPR) {
      questions.push(`J'ai battu mon PR sur ${recentPR.exerciseName} — comment continuer à progresser ?`);
    }

    // 4. 5 jours consécutifs dans l'objectif calorique
    if (store.user) {
      let streak = 0;
      for (let i = 0; i < 7; i++) {
        const dStr = daysAgo(i);
        const dayMeals = store.meals.filter(m => m.date === dStr);
        if (dayMeals.length === 0) break;
        const cal = dayMeals.flatMap(m => m.items).reduce((s, i) => s + i.caloriesPer100g * i.quantity / 100, 0);
        const target = store.user.targetCalories;
        if (cal >= target * 0.9 && cal <= target * 1.1) streak++;
        else break;
      }
      if (streak >= 5) {
        questions.push(`Je respecte mon objectif depuis ${streak} jours — quelle est la prochaine étape ?`);
      }
    }

    // Fallback : questions génériques si peu de contexte
    if (questions.length < 2) {
      questions.push('Analyse ma nutrition de cette semaine', 'Comment booster mes performances ?');
    }

    return questions.slice(0, 4); // max 4 suggestions
  }, [store.workouts, store.meals, store.prs, store.user]);

  const handleNewConversation = useCallback(async () => {
    if (store.chat.length === 0) return;
    const title = store.chat[0]?.content?.slice(0, 50) ?? `Conversation du ${new Date().toLocaleDateString('fr-FR')}`;
    const conv: StoredConversation = {
      id: Date.now().toString(),
      date: today(),
      title,
      messages: store.chat,
    };
    await saveConversation(conv);
    store.clearChat();
  }, [store]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || !store.user) return;
    const userMsg: ChatMessage = {
      id: Date.now().toString(), role: 'user', content: text.trim(), timestamp: new Date().toISOString(),
    };
    await store.addChatMessage(userMsg);
    setInput('');
    setLoading(true);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const reply = await sendCoachMessage(text.trim(), store.chat, store.user, store.getRecentWorkouts(7), store.getRecentMeals(7), store.getTodayMacros());
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: reply, timestamp: new Date().toISOString() };
      await store.addChatMessage(botMsg);
    } catch (e: any) {
      await store.addChatMessage({ id: (Date.now() + 2).toString(), role: 'assistant', content: `Erreur : ${e.message ?? 'Impossible de contacter le coach.'}`, timestamp: new Date().toISOString() });
    } finally {
      setLoading(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [store]);

  const handleGenerateMealPlan = useCallback(async () => {
    if (!store.user) return;
    setGeneratingMealPlan(true);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: '📅 Génère mon plan repas pour la semaine', timestamp: new Date().toISOString() };
    await store.addChatMessage(userMsg);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const plan = await generateMealPlan(store.user);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: plan, timestamp: new Date().toISOString() };
      await store.addChatMessage(botMsg);
    } catch {
      await store.addChatMessage({ id: (Date.now() + 2).toString(), role: 'assistant', content: 'Erreur lors de la génération du plan repas.', timestamp: new Date().toISOString() });
    } finally {
      setGeneratingMealPlan(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [store]);

  const handleSavePlan = useCallback(async (content: string) => {
    if (!store.user) return;
    const lines  = content.split('\n').filter(l => l.trim()).slice(0, 2).join(' ').slice(0, 60);
    const title  = lines || `Plan du ${new Date().toLocaleDateString('fr-FR')}`;
    const isNutr = content.toLowerCase().includes('kcal') || content.toLowerCase().includes('repas');
    const plan: SavedPlan = {
      id:    `plan_${Date.now()}`,
      type:  isNutr ? 'nutrition' : 'sport',
      title,
      content,
      date:  storage.today(),
    };
    await store.savePlan(plan);
    Alert.alert('💾 Plan sauvegardé !', `"${title}" est disponible dans Progrès → Plans.`, [{ text: 'Super !' }]);
  }, [store]);

  const handleApplyMealPlan = useCallback(async (msgId: string, content: string) => {
    Alert.alert(
      '📅 Appliquer ce plan repas',
      'Les repas seront importés dans ton journal nutritionnel pour cette semaine. Tu pourras les modifier.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Appliquer',
          onPress: async () => {
            setApplyingPlan(msgId);
            try {
              const count = await applyMealPlanToWeek(content, store.addMeal, store.meals);
              Alert.alert(
                '✅ Plan importé !',
                count > 0
                  ? `${count} repas ont été ajoutés à ton journal de la semaine.`
                  : "Aucun repas détecté — le format du plan n'est pas reconnu.",
              );
            } catch {
              Alert.alert('Erreur', 'Impossible d\'importer le plan.');
            } finally {
              setApplyingPlan(null);
            }
          },
        },
      ],
    );
  }, [store]);

  // ── Analyse récupération ───────────────────────────────────────────────────
  const recoveryAlerts = useMemo(() => {
    const alerts: { key: string; message: string }[] = [];
    const todayStr = today();
    const yestStr = yesterday();

    const todayMuscles  = new Set(store.workouts.filter(w => w.date === todayStr).flatMap(w => w.exercises.map(e => e.category)).filter(Boolean));
    const yestMuscles   = new Set(store.workouts.filter(w => w.date === yestStr).flatMap(w => w.exercises.map(e => e.category)).filter(Boolean));
    const overlap = [...todayMuscles].filter(m => yestMuscles.has(m));
    if (overlap.length > 0) {
      alerts.push({ key: 'overlap', message: `⚠️ Tu as entraîné tes ${overlap.join(', ')} hier et aujourd'hui. Laisse 48h de récupération pour éviter les blessures.` });
    }

    let streak = 0;
    for (let i = 0; i < 7; i++) {
      const d = daysAgo(i);
      if (store.workouts.some(w => w.date === d)) streak++;
      else break;
    }
    if (streak >= 5) {
      alerts.push({ key: 'streak', message: `⚠️ Tu t'entraînes depuis ${streak} jours consécutifs. Un jour de récupération active est recommandé.` });
    }

    const cut7 = daysAgo(7);
    const muscleVol: Record<string, number> = {};
    store.workouts.filter(w => w.date >= cut7).forEach(w => {
      w.exercises.forEach(e => {
        if (e.category && e.category !== 'Cardio') {
          muscleVol[e.category] = (muscleVol[e.category] ?? 0) + e.sets.length;
        }
      });
    });
    Object.entries(muscleVol).filter(([_, v]) => v > 20).forEach(([muscle, vol]) => {
      alerts.push({ key: `overvol_${muscle}`, message: `⚠️ Volume élevé sur ${muscle} cette semaine (${vol} séries). Réduis ou compense avec du sommeil et de la nutrition.` });
    });

    return alerts;
  }, [store.workouts]);

  // ── Analyse carences nutritionnelles ──────────────────────────────────────
  const handleAnalyzeNutrition = useCallback(async () => {
    if (!store.user) return;
    setAnalyzingNutrition(true);
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: '🔬 Analyse mes carences nutritionnelles des 7 derniers jours', timestamp: new Date().toISOString() };
    await store.addChatMessage(userMsg);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    try {
      const analysis = await analyzeNutritionDeficiencies(store.meals, store.user);
      const botMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: analysis, timestamp: new Date().toISOString() };
      await store.addChatMessage(botMsg);
    } catch {
      await store.addChatMessage({ id: (Date.now() + 2).toString(), role: 'assistant', content: 'Erreur lors de l\'analyse.', timestamp: new Date().toISOString() });
    } finally {
      setAnalyzingNutrition(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [store]);

  return (
    <AnimatedScreen style={{ flex: 1 }}>
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <View style={styles.coachBar}>
        <View style={styles.coachAvatar}>
          <Ionicons name="sparkles" size={20} color={Colors.primary} />
        </View>
        <View>
          <Text style={styles.coachName}>FitCoach IA</Text>
          <Text style={styles.coachSub}>{DEMO_MODE ? 'Mode démo' : `${PERSONA_LABELS[currentPersona] ?? ''} · GPT-4o`}</Text>
        </View>
        <TouchableOpacity onPress={() => setShowHistory(true)} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Historique des conversations" hitSlop={tapSlop}>
          <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleNewConversation} style={styles.clearBtn} accessibilityRole="button" accessibilityLabel="Nouvelle conversation" hitSlop={tapSlop}>
          <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* ── Alertes de récupération ──────────────────────────────────────── */}
      {recoveryAlerts.length > 0 && (
        <View style={{ padding: Sp.sm, gap: Sp.xs }}>
          {recoveryAlerts.map(alert => (
            <View key={alert.key} style={{ backgroundColor: Colors.orange + '15', borderRadius: R, borderWidth: 1, borderColor: Colors.orange + '40', padding: Sp.sm, flexDirection: 'row', gap: Sp.sm, alignItems: 'flex-start' }}>
              <Ionicons name="warning-outline" size={16} color={Colors.orange} style={{ marginTop: 2 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.orange, lineHeight: 18 }}>{alert.message}</Text>
                <TouchableOpacity onPress={() => sendMessage(alert.message.replace('⚠️ ', '') + ' Que faire ?')} style={{ marginTop: 4 }}>
                  <Text style={{ fontSize: Fs.xs, color: Colors.primary, fontFamily: Fonts.semibold }}>Demander au coach →</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Messages ─────────────────────────────────────────────────────── */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
      >
        {store.chat.length === 0 && (
          <View style={styles.welcome}>
            <Text style={styles.welcomeEmoji}>🤖</Text>
            <Text style={styles.welcomeTitle}>Ton coach IA personnel</Text>
            <Text style={styles.welcomeText}>J'analyse tes données de sport et nutrition pour te donner des conseils précis et personnalisés.</Text>
            {DEMO_MODE && (
              <View style={styles.demoWarning}>
                <Ionicons name="warning-outline" size={14} color={Colors.orange} />
                <Text style={styles.demoText}>Mode démo — ajoute EXPO_PUBLIC_OPENAI_KEY pour GPT-4o</Text>
              </View>
            )}
            <Button
              title="Analyse ma semaine 📊"
              icon="bar-chart-outline"
              onPress={() => sendMessage(WEEKLY_ANALYSIS_PROMPT)}
              style={{ marginBottom: 8 }}
            />
            <TouchableOpacity style={styles.mealPlanBtn} onPress={handleGenerateMealPlan} disabled={generatingMealPlan}>
              {generatingMealPlan
                ? <ActivityIndicator size="small" color={Colors.green} />
                : <Ionicons name="calendar-outline" size={16} color={Colors.green} />}
              <Text style={styles.mealPlanBtnText}>📅 Générer mon plan repas semaine</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nutritionAnalysisBtn} onPress={handleAnalyzeNutrition} disabled={analyzingNutrition}>
              {analyzingNutrition ? <ActivityIndicator size="small" color={Colors.yellow} /> : <Ionicons name="flask-outline" size={16} color={Colors.yellow} />}
              <Text style={styles.nutritionAnalysisBtnText}>🔬 Analyser ma nutrition</Text>
            </TouchableOpacity>
            <View style={styles.quickBtns}>
              {contextualQuestions.map(q => (
                <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => sendMessage(q)}>
                  <Text style={styles.quickBtnText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {store.chat.map((msg, idx) => (
          <React.Fragment key={msg.id}>
            <Bubble msg={msg} />
            {/* Boutons d'action sous les réponses assistant suffisamment longues */}
            {msg.role === 'assistant' && looksLikePlan(msg.content) && (
              <View style={styles.msgActions}>
                {/* Sauvegarder ce plan */}
                <TouchableOpacity style={styles.savePlanBtn} onPress={() => handleSavePlan(msg.content)}>
                  <Ionicons name="save-outline" size={13} color={Colors.primary} />
                  <Text style={styles.savePlanBtnText}>💾 Sauvegarder ce plan</Text>
                </TouchableOpacity>
                {/* Appliquer à cette semaine (plan repas uniquement) */}
                {looksLikeMealPlan(msg.content) && (
                  <TouchableOpacity
                    style={styles.applyPlanBtn}
                    onPress={() => handleApplyMealPlan(msg.id, msg.content)}
                    disabled={applyingPlan === msg.id}
                  >
                    {applyingPlan === msg.id
                      ? <ActivityIndicator size="small" color={Colors.green} />
                      : <Ionicons name="calendar-outline" size={13} color={Colors.green} />}
                    <Text style={styles.applyPlanBtnText}>Appliquer à cette semaine</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </React.Fragment>
        ))}

        {(loading || generatingMealPlan) && (
          <View style={styles.typing}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.typingText}>{generatingMealPlan ? 'Génération du plan repas…' : 'FitCoach rédige…'}</Text>
          </View>
        )}
      </ScrollView>

      {/* ── Saisie ───────────────────────────────────────────────────────── */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Pose une question…"
          placeholderTextColor={Colors.textMuted}
          multiline
          maxLength={600}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!input.trim() || loading) && styles.sendBtnDisabled]}
          onPress={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          accessibilityLabel="Envoyer le message au coach"
          accessibilityRole="button"
        >
          <Ionicons name="send" size={18} color={Colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

    {/* ── Modal historique ────────────────────────────────────────────────── */}
    <Modal visible={showHistory} animationType="slide" onRequestClose={() => setShowHistory(false)}>
      <ConversationHistoryModal
        onClose={() => setShowHistory(false)}
        onRestore={() => setShowHistory(false)}
      />
    </Modal>

    </AnimatedScreen>
  );
}

// ─── Bulle de message ─────────────────────────────────────────────────────────

function Bubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';
  const time   = new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return (
    <View style={[bStyles.row, isUser && bStyles.rowRight]}>
      {!isUser && (
        <View style={bStyles.avatar}>
          <Ionicons name="sparkles" size={13} color={Colors.primary} />
        </View>
      )}
      <View style={[bStyles.bubble, isUser ? bStyles.userBubble : bStyles.botBubble]}>
        <Text style={[bStyles.text, isUser && bStyles.userText]}>{msg.content}</Text>
        <Text style={[bStyles.time, isUser && { color: 'rgba(255,255,255,0.45)' }]}>{time}</Text>
      </View>
    </View>
  );
}

// ─── Modal historique des conversations ───────────────────────────────────────

function ConversationHistoryModal({ onClose, onRestore }: {
  onClose: () => void;
  onRestore: (conv: StoredConversation) => void;
}) {
  const [conversations, setConversations] = useState<StoredConversation[]>([]);
  const [selected, setSelected] = useState<StoredConversation | null>(null);

  useEffect(() => { loadConversations().then(setConversations); }, []);

  if (selected) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.bg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
          <TouchableOpacity onPress={() => setSelected(null)} accessibilityRole="button" accessibilityLabel="Retour" hitSlop={tapSlop}><Ionicons name="arrow-back" size={20} color={Colors.text} /></TouchableOpacity>
          <Text style={{ flex: 1, fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text }} numberOfLines={1}>{selected.title}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: Sp.md, gap: Sp.sm }}>
          {selected.messages.map(msg => (
            <View key={msg.id} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', backgroundColor: msg.role === 'user' ? Colors.primary : Colors.surfaceElevated, borderRadius: 12, padding: Sp.sm }}>
              <Text style={{ color: '#fff', fontSize: Fs.sm, fontFamily: Fonts.regular }}>{msg.content}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
        <Text style={{ flex: 1, fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text }}>Historique</Text>
        <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={tapSlop}><Ionicons name="close" size={22} color={Colors.text} /></TouchableOpacity>
      </View>
      {conversations.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: Colors.textMuted, fontSize: Fs.md, fontFamily: Fonts.regular }}>Aucune conversation sauvegardée</Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          keyExtractor={c => c.id}
          contentContainerStyle={{ padding: Sp.md, gap: Sp.sm }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={{ backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md }}
              onPress={() => setSelected(item)}
            >
              <Text style={{ fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text }} numberOfLines={2}>{item.title}</Text>
              <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 4 }}>{item.date} · {item.messages.length} messages</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const bStyles = StyleSheet.create({
  row:         { flexDirection: 'row', marginBottom: Sp.sm, alignItems: 'flex-end', gap: 6 },
  rowRight:    { flexDirection: 'row-reverse' },
  avatar:      { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  bubble:      { maxWidth: '78%', borderRadius: 16, padding: Sp.sm + 2 },
  userBubble:  { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  botBubble:   { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border, borderBottomLeftRadius: 4 },
  text:        { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.text, lineHeight: 20 },
  userText:    { color: '#fff' },
  time:        { fontSize: 10, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 4, alignSelf: 'flex-end' },
});

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.bg },
  coachBar:        { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  coachAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary + '20', alignItems: 'center', justifyContent: 'center' },
  coachName:       { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.text },
  coachSub:        { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  clearBtn:        { marginLeft: 'auto', padding: 6 },
  messages:        { flex: 1 },
  messagesContent: { padding: Sp.md, paddingBottom: Sp.lg },
  welcome:         { alignItems: 'center', paddingVertical: Sp.xl },
  welcomeEmoji:    { fontSize: 48, fontFamily: Fonts.regular, marginBottom: Sp.md },
  welcomeTitle:    { fontSize: Fs.xl, fontFamily: Fonts.bold, color: Colors.text, marginBottom: Sp.xs },
  welcomeText:     { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: Sp.md, marginBottom: Sp.lg },
  demoWarning:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.orange + '15', borderRadius: R, paddingHorizontal: Sp.md, paddingVertical: Sp.xs, marginBottom: Sp.md },
  demoText:        { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.orange, flex: 1 },
  weeklyBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: R, padding: Sp.sm, width: '100%', marginBottom: 8 },
  weeklyBtnText:   { fontSize: Fs.sm, fontFamily: Fonts.bold, color: '#fff' },
  mealPlanBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.green + '20', borderRadius: R, padding: Sp.sm, width: '100%', marginBottom: 8, borderWidth: 1, borderColor: Colors.green + '40' },
  mealPlanBtnText: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.green },
  nutritionAnalysisBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.yellow + '20', borderRadius: R, padding: Sp.sm, width: '100%', marginBottom: 12, borderWidth: 1, borderColor: Colors.yellow + '40' },
  nutritionAnalysisBtnText: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.yellow },
  quickBtns:       { gap: 8, width: '100%' },
  quickBtn:        { backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.sm, borderWidth: 1, borderColor: Colors.border },
  quickBtnText:    { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.primary, textAlign: 'center' },
  // Boutons d'action sous les messages
  msgActions: { marginLeft: 34, marginTop: -Sp.xs, marginBottom: Sp.sm, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  savePlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '15', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  savePlanBtnText: { fontSize: Fs.xs, color: Colors.primary, fontFamily: Fonts.medium },
  applyPlanBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.green + '15', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  applyPlanBtnText: { fontSize: Fs.xs, color: Colors.green, fontFamily: Fonts.medium },
  // Indicateur de frappe
  typing:      { flexDirection: 'row', alignItems: 'center', gap: 8, padding: Sp.sm },
  typingText:  { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  // Saisie
  inputBar:    { flexDirection: 'row', alignItems: 'flex-end', gap: Sp.sm, padding: Sp.sm, paddingBottom: Platform.OS === 'ios' ? Sp.md : Sp.sm, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface },
  input:       { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: 20, paddingHorizontal: Sp.md, paddingVertical: Sp.sm, fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.text, maxHeight: 100, borderWidth: 1, borderColor: Colors.border },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.4 },
});
