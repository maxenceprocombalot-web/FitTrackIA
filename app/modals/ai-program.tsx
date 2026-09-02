import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { generateCustomProgram, generateStructuredProgram } from '../../services/openai';
import { SavedPlan } from '../../types';
import { ProgramTemplate } from '../../constants/programs';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';
import Button from '../../components/ui/Button';
import { usePremiumGate } from '../../hooks/usePremiumGate';
import * as storage from '../../services/storage';

type Level     = 'Débutant' | 'Intermédiaire' | 'Avancé';
type Goal      = 'Force' | 'Hypertrophie' | 'Perte de poids';
type Equipment = 'Salle complète' | 'Haltères seulement' | 'Poids du corps';

const DAYS_OPTIONS: number[]       = [3, 4, 5, 6];
const LEVEL_OPTIONS: Level[]       = ['Débutant', 'Intermédiaire', 'Avancé'];
const GOAL_OPTIONS: Goal[]         = ['Force', 'Hypertrophie', 'Perte de poids'];
const EQUIP_OPTIONS: Equipment[]   = ['Salle complète', 'Haltères seulement', 'Poids du corps'];

/** Rendu lisible d'un programme structuré, pour l'aperçu et le partage. */
function programToText(p: ProgramTemplate): string {
  const head = `${p.emoji} ${p.name}\n${p.description}\n${p.daysPerWeek} séances/semaine · ~${p.sessionDuration} min\n`;
  const body = p.sessions.map(s =>
    `\n── ${s.dayLabel} · ${s.name} (${s.focus}) ──\n` +
    s.exercises.map(e => `• ${e.name} — ${e.sets}×${e.reps}, repos ${e.rest}s${e.notes ? ` (${e.notes})` : ''}`).join('\n'),
  ).join('\n');
  return head + body;
}

export default function AIProgramModal() {
  const router = useRouter();
  const store  = useAppStore();
  const { requirePremium } = usePremiumGate();

  const [days,      setDays]      = useState<number>(4);
  const [level,     setLevel]     = useState<Level>('Intermédiaire');
  const [goal,      setGoal]      = useState<Goal>('Hypertrophie');
  const [equipment, setEquipment] = useState<Equipment>('Salle complète');
  const [loading,   setLoading]   = useState(false);
  const [result,    setResult]    = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);
  // Programme structuré (séances/exercices) : c'est lui qui rend le résultat
  // démarrable. Null si l'IA n'a pas su produire une structure exploitable —
  // on retombe alors sur le texte, sans bloquer l'utilisateur.
  const [structured, setStructured] = useState<ProgramTemplate | null>(null);

  const handleGenerate = async () => {
    if (!store.user) return;
    if (!requirePremium()) return;   // fonction IA → premium
    setLoading(true);
    try {
      const params = { daysPerWeek: days, level, goal, equipment, name: store.user.name };
      // On demande d'abord une structure ; si le modèle ne la produit pas
      // proprement, on bascule sur la version texte plutôt que d'échouer.
      const { program, text } = await generateStructuredProgram(params);
      setStructured(program);
      // Repli sur le texte déjà reçu : relancer une génération complète
      // coûtait un second appel et 10 à 30 s d'attente pour rien.
      setResult(program ? programToText(program) : (text.trim() || await generateCustomProgram(params)));
      setSaved(false);
    } catch (e: any) {
      // AIError porte la cause réelle (hors-ligne, quota, clé refusée) :
      // afficher « vérifie ta connexion » pour un quota dépassé induit en erreur.
      Alert.alert('Génération impossible', e?.message ?? 'Réessaie plus tard.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!result) return;
    // Un programme structuré est enregistré comme un vrai programme : il
    // apparaît dans la bibliothèque, se démarre et se suit séance par séance.
    if (structured) await store.saveAiProgram(structured);
    const plan: SavedPlan = {
      id: `ai_prog_${Date.now()}`,
      type: 'sport',
      title: structured?.name ?? `Programme IA — ${level} ${goal} ${days}j/sem`,
      content: result,
      date: storage.today(),
      ...(structured ? { programId: structured.id } : {}),
    };
    await store.savePlan(plan);
    setSaved(true);
    if (structured) {
      Alert.alert(
        '💪 Programme prêt !',
        'Il est dans ta bibliothèque, onglet Programmes. Tu peux le démarrer et suivre chaque séance.',
        [
          { text: 'Plus tard', style: 'cancel' },
          { text: 'Voir le programme', onPress: () => router.replace(`/programs/${structured.id}`) },
        ],
      );
    } else {
      Alert.alert('💾 Sauvegardé !', 'Retrouve-le dans l\'onglet Programmes → Mes plans.');
    }
  };

  // ── Vue résultat ──────────────────────────────────────────────────────────

  if (result) {
    return (
      <View style={styles.container}>
        <View style={styles.resultHeader}>
          <Text style={styles.resultTitle}>🧠 Programme généré</Text>
          <Text style={styles.resultSub}>
            {level} • {goal} • {days}j/sem • {equipment}
          </Text>
        </View>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.resultText}>{result}</Text>
          <View style={{ height: 120 }} />
        </ScrollView>
        <View style={styles.resultActions}>
          <TouchableOpacity accessibilityRole="button" style={styles.newBtn} onPress={() => { setResult(null); setSaved(false); }}>
            <Text style={styles.newBtnText}>Nouveau</Text>
          </TouchableOpacity>
          <Button
            title={saved ? '✓ Sauvegardé' : '💾 Sauvegarder'}
            icon={saved ? 'checkmark-circle' : 'save-outline'}
            onPress={saved ? () => router.back() : handleSave}
            fullWidth={false}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    );
  }

  // ── Vue questionnaire ─────────────────────────────────────────────────────

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEmoji}>🧠</Text>
        <Text style={styles.heroTitle}>Programme IA Personnalisé</Text>
        <Text style={styles.heroSub}>
          GPT-4o génère un programme complet adapté à tes paramètres.
        </Text>
      </View>

      {/* Jours/semaine */}
      <Section label="Jours d'entraînement par semaine">
        <View style={styles.opts}>
          {DAYS_OPTIONS.map(d => (
            <OptionBtn
              key={d}
              label={`${d} jours`}
              active={days === d}
              color={Colors.primary}
              onPress={() => setDays(d)}
            />
          ))}
        </View>
      </Section>

      {/* Niveau */}
      <Section label="Niveau">
        <View style={styles.opts}>
          {LEVEL_OPTIONS.map(l => (
            <OptionBtn key={l} label={l} active={level === l} color={Colors.green} onPress={() => setLevel(l)} />
          ))}
        </View>
      </Section>

      {/* Objectif */}
      <Section label="Objectif">
        <View style={styles.opts}>
          {GOAL_OPTIONS.map(g => (
            <OptionBtn key={g} label={g} active={goal === g} color={Colors.orange} onPress={() => setGoal(g)} />
          ))}
        </View>
      </Section>

      {/* Équipement */}
      <Section label="Équipement disponible">
        <View style={styles.opts}>
          {EQUIP_OPTIONS.map(e => (
            <OptionBtn key={e} label={e} active={equipment === e} color={Colors.blue} onPress={() => setEquipment(e)} />
          ))}
        </View>
      </Section>

      {/* Bouton générer */}
      <Button
        title="Générer mon programme"
        icon="sparkles"
        onPress={handleGenerate}
        loading={loading}
        size="lg"
      />

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      {children}
    </View>
  );
}

function OptionBtn({ label, active, onPress, color }: {
  label: string; active: boolean; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity accessibilityRole="button"
      style={[styles.optBtn, active && { borderColor: color, backgroundColor: color + '18' }]}
      onPress={onPress}
    >
      <Text style={[styles.optBtnText, active && { color, fontFamily: Fonts.bold }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  content: { padding: Sp.md, gap: Sp.lg, paddingBottom: Sp.xxl },
  hero: { alignItems: 'center', paddingVertical: Sp.lg, gap: 8 },
  heroEmoji: { fontSize: 52 },
  heroTitle: { fontSize: Fs.xl, fontFamily: Fonts.heavy, color: Colors.text },
  heroSub: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20, paddingHorizontal: Sp.md },
  section: { gap: Sp.sm },
  sectionLabel: { fontSize: Fs.xs, fontFamily: Fonts.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  opts: { flexDirection: 'row', flexWrap: 'wrap', gap: Sp.xs },
  optBtn: { paddingHorizontal: Sp.md, paddingVertical: 10, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  optBtnText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  generateBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: R, padding: Sp.md, marginTop: Sp.sm,
  },
  generateBtnText: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.onPrimary },
  // Résultat
  resultHeader: { padding: Sp.lg, paddingBottom: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  resultTitle: { fontSize: Fs.xl, fontFamily: Fonts.heavy, color: Colors.text },
  resultSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 4 },
  scroll: { flex: 1 },
  scrollContent: { padding: Sp.lg },
  resultText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary, lineHeight: 22 },
  resultActions: {
    flexDirection: 'row', gap: Sp.sm,
    padding: Sp.md, borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  newBtn: { paddingHorizontal: Sp.lg, paddingVertical: Sp.sm, borderRadius: R, borderWidth: 1, borderColor: Colors.border },
  newBtnText: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
});
