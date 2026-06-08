import React, { useState, useRef } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { User, Gender, Goal, ActivityLevel } from '../../types';
import { computeTDEE, computeTargetCalories, computeMacros } from '../../services/openai';
import { Colors, R, Sp, Fs, Fw } from '../../constants/theme';

const TOTAL_STEPS = 5;
const SCREEN_W    = Dimensions.get('window').width;

// ─── Données de configuration ─────────────────────────────────────────────────

const GOALS: { value: Goal; emoji: string; label: string; desc: string }[] = [
  { value: 'weight_loss',  emoji: '🔥', label: 'Perdre du poids',      desc: 'Déficit calorique, brûle les graisses' },
  { value: 'muscle_gain',  emoji: '💪', label: 'Prendre de la masse',  desc: 'Surplus calorique, construis du muscle' },
  { value: 'maintenance',  emoji: '⚖️', label: 'Maintenir',            desc: 'Équilibre, garde ta forme actuelle' },
];

const ACTIVITIES: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: 'sedentary',   label: 'Sédentaire',     desc: 'Bureau, peu ou pas de sport' },
  { value: 'light',       label: 'Légèrement actif', desc: '1-2 entraînements/sem.' },
  { value: 'moderate',    label: 'Modérément actif', desc: '3-4 entraînements/sem.' },
  { value: 'active',      label: 'Actif',           desc: '5 entraînements/sem.' },
  { value: 'very_active', label: 'Très actif',      desc: 'Sport quotidien ou physique' },
];

export default function OnboardingModal() {
  const router  = useRouter();
  const store   = useAppStore();
  const existing = store.user;

  const [step,         setStep]         = useState(0);
  const [name,         setName]         = useState(existing?.name     ?? '');
  const [gender,       setGender]       = useState<Gender>(existing?.gender   ?? 'male');
  const [age,          setAge]          = useState(existing?.age.toString()   ?? '');
  const [height,       setHeight]       = useState(existing?.height.toString() ?? '');
  const [weight,       setWeight]       = useState(existing?.weight.toString() ?? '');
  const [goal,         setGoal]         = useState<Goal>(existing?.goal     ?? 'maintenance');
  const [activity,     setActivity]     = useState<ActivityLevel>(existing?.activityLevel ?? 'moderate');
  // RGPD : pré-coché si l'utilisateur a déjà accepté (édition de profil)
  const [gdprAccepted, setGdprAccepted] = useState(!!existing?.gdprAcceptedAt);

  // Calculs TDEE affichés à l'étape 5
  const tdee = (() => {
    const a = parseInt(age); const h = parseInt(height); const w = parseFloat(weight);
    if (!a || !h || !w) return 0;
    return computeTDEE(gender, w, h, a, activity);
  })();
  const targetCal = computeTargetCalories(tdee, goal);
  const macros    = computeMacros(targetCal, parseFloat(weight) || 70);

  const canNext = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return !!parseInt(age) && !!parseFloat(height) && !!parseFloat(weight);
    if (step === TOTAL_STEPS - 1) return gdprAccepted; // consentement obligatoire
    return true;
  };

  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const goPrev = () => setStep(s => Math.max(s - 1, 0));

  const handleFinish = async () => {
    const user: User = {
      id: existing?.id ?? '1',
      name: name.trim(),
      gender,
      age:    parseInt(age),
      height: parseFloat(height),
      weight: parseFloat(weight),
      goal,
      activityLevel: activity,
      tdee,
      targetCalories: targetCal,
      targetProtein: macros.protein,
      targetCarbs:   macros.carbs,
      targetFat:     macros.fat,
      onboardingDone: true,
      gdprAcceptedAt: existing?.gdprAcceptedAt ?? new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    await store.setUser(user);
    router.replace('/(tabs)');
  };

  const progressWidth = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <View style={styles.container}>
      {/* Barre de progression */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* ── Étape 1 : Identité ───────────────────────────────────────── */}
        {step === 0 && (
          <Step title="Comment tu t'appelles ?" subtitle="Et ton genre ?">
            <TextInput
              style={styles.bigInput}
              value={name}
              onChangeText={setName}
              placeholder="Ton prénom"
              placeholderTextColor={Colors.textMuted}
              autoFocus
              autoCapitalize="words"
              returnKeyType="next"
              onSubmitEditing={goNext}
            />
            <View style={styles.genderRow}>
              <GenderBtn value="male"   label="Homme" emoji="👨" active={gender === 'male'}   onPress={() => setGender('male')} />
              <GenderBtn value="female" label="Femme"  emoji="👩" active={gender === 'female'} onPress={() => setGender('female')} />
            </View>
          </Step>
        )}

        {/* ── Étape 2 : Mesures ────────────────────────────────────────── */}
        {step === 1 && (
          <Step title="Tes données physiques" subtitle="Utilisées pour calculer ton métabolisme">
            <NumInput label="Âge"         value={age}    onChange={setAge}    unit="ans" placeholder="25" />
            <NumInput label="Taille"      value={height} onChange={setHeight} unit="cm"  placeholder="175" />
            <NumInput label="Poids actuel" value={weight} onChange={setWeight} unit="kg"  placeholder="75" decimal />
          </Step>
        )}

        {/* ── Étape 3 : Objectif ───────────────────────────────────────── */}
        {step === 2 && (
          <Step title="Quel est ton objectif ?" subtitle="On adapte tes calories en conséquence">
            {GOALS.map(g => (
              <OptionCard
                key={g.value}
                emoji={g.emoji} label={g.label} desc={g.desc}
                active={goal === g.value}
                onPress={() => setGoal(g.value)}
              />
            ))}
          </Step>
        )}

        {/* ── Étape 4 : Activité ───────────────────────────────────────── */}
        {step === 3 && (
          <Step title="Ton niveau d'activité" subtitle="Entraînements par semaine hors travail">
            {ACTIVITIES.map(a => (
              <OptionCard
                key={a.value}
                label={a.label} desc={a.desc}
                active={activity === a.value}
                onPress={() => setActivity(a.value)}
              />
            ))}
          </Step>
        )}

        {/* ── Étape 5 : Récapitulatif TDEE + RGPD ────────────────────── */}
        {step === 4 && (
          <Step title="Ton plan personnalisé 🔥" subtitle="Calculé avec Harris-Benedict">
            <View style={styles.tdeeCard}>
              <View style={styles.tdeeRow}>
                <Text style={styles.tdeeLabel}>TDEE (maintenance)</Text>
                <Text style={styles.tdeeValue}>{tdee} kcal</Text>
              </View>
              <View style={styles.tdeeRow}>
                <Text style={styles.tdeeLabel}>Cible journalière</Text>
                <Text style={[styles.tdeeValue, { color: Colors.primary }]}>{targetCal} kcal</Text>
              </View>
            </View>
            <View style={styles.macrosGrid}>
              <MacroCell label="Protéines" value={macros.protein} unit="g" color={Colors.proteinColor} />
              <MacroCell label="Glucides"  value={macros.carbs}   unit="g" color={Colors.carbsColor} />
              <MacroCell label="Lipides"   value={macros.fat}     unit="g" color={Colors.fatColor} />
            </View>
            <View style={styles.tdeeNote}>
              <Ionicons name="information-circle-outline" size={14} color={Colors.textMuted} />
              <Text style={styles.tdeeNoteText}>
                {goal === 'weight_loss'  && `TDEE ${tdee} − 500 kcal de déficit = ${targetCal} kcal/j`}
                {goal === 'muscle_gain'  && `TDEE ${tdee} + 300 kcal de surplus = ${targetCal} kcal/j`}
                {goal === 'maintenance'  && `TDEE = ${tdee} kcal/j (équilibre énergétique)`}
              </Text>
            </View>

            {/* ── Consentement RGPD ──────────────────────────────────── */}
            <View style={styles.gdprBox}>
              <TouchableOpacity
                style={styles.gdprCheckRow}
                onPress={() => setGdprAccepted(v => !v)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: gdprAccepted }}
                accessibilityLabel="J'accepte la politique de confidentialité et les conditions d'utilisation"
              >
                <View style={[styles.checkbox, gdprAccepted && styles.checkboxChecked]}>
                  {gdprAccepted && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.gdprCheckText}>
                  J'accepte la{' '}
                  <Text style={styles.gdprLink} onPress={() => router.push('/modals/privacy-policy')}>
                    politique de confidentialité
                  </Text>
                  {' '}et les{' '}
                  <Text style={styles.gdprLink} onPress={() => router.push('/modals/terms')}>
                    conditions d'utilisation
                  </Text>
                </Text>
              </TouchableOpacity>
              <View style={styles.gdprInfo}>
                <Ionicons name="shield-checkmark-outline" size={13} color={Colors.green} />
                <Text style={styles.gdprInfoText}>
                  Données stockées uniquement sur cet appareil. Le coach IA utilise OpenAI.
                </Text>
              </View>
            </View>

            {/* ── Suppression des données (uniquement si édition de profil) */}
            {!!existing && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => Alert.alert(
                  '⚠️ Supprimer toutes mes données',
                  'Cette action est irréversible. Toutes tes séances, repas, poids et préférences seront supprimés définitivement.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Supprimer', style: 'destructive', onPress: () => store.deleteAllData() },
                  ],
                )}
                accessibilityLabel="Supprimer toutes mes données"
                accessibilityRole="button"
              >
                <Ionicons name="trash-outline" size={16} color={Colors.red} />
                <Text style={styles.deleteBtnText}>Supprimer toutes mes données</Text>
              </TouchableOpacity>
            )}
          </Step>
        )}

        {/* ── Navigation ───────────────────────────────────────────────── */}
        <View style={styles.navRow}>
          {step > 0 && (
            <TouchableOpacity style={styles.backBtn} onPress={goPrev}>
              <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.nextBtn, !canNext() && styles.nextBtnDisabled]}
            onPress={step < TOTAL_STEPS - 1 ? goNext : handleFinish}
            disabled={!canNext()}
          >
            <Text style={styles.nextBtnText}>
              {step < TOTAL_STEPS - 1 ? 'Suivant' : "C'est parti 🔥"}
            </Text>
            <Ionicons name={step < TOTAL_STEPS - 1 ? 'arrow-forward' : 'checkmark'} size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <View style={stepStyles.container}>
      <Text style={stepStyles.title}>{title}</Text>
      <Text style={stepStyles.subtitle}>{subtitle}</Text>
      <View style={stepStyles.body}>{children}</View>
    </View>
  );
}
const stepStyles = StyleSheet.create({
  container: { paddingTop: Sp.xl },
  title: { fontSize: Fs.xxl, fontWeight: Fw.heavy, color: Colors.text, marginBottom: 6 },
  subtitle: { fontSize: Fs.sm, color: Colors.textSecondary, marginBottom: Sp.lg },
  body: { gap: Sp.sm },
});

function GenderBtn({ label, emoji, active, onPress }: { value: Gender; label: string; emoji: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[gbStyles.btn, active && gbStyles.active]} onPress={onPress}>
      <Text style={gbStyles.emoji}>{emoji}</Text>
      <Text style={[gbStyles.label, active && gbStyles.labelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const gbStyles = StyleSheet.create({
  btn: { flex: 1, alignItems: 'center', paddingVertical: Sp.lg, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated, gap: 6 },
  active: { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  emoji: { fontSize: 32 },
  label: { fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.textSecondary },
  labelActive: { color: Colors.primary },
});

function NumInput({ label, value, onChange, unit, placeholder, decimal }: { label: string; value: string; onChange: (v: string) => void; unit: string; placeholder: string; decimal?: boolean }) {
  return (
    <View style={niStyles.container}>
      <Text style={niStyles.label}>{label}</Text>
      <View style={niStyles.row}>
        <TextInput
          style={niStyles.input}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          returnKeyType="next"
        />
        <Text style={niStyles.unit}>{unit}</Text>
      </View>
    </View>
  );
}
const niStyles = StyleSheet.create({
  container: {},
  label: { fontSize: Fs.sm, color: Colors.textSecondary, marginBottom: 4, fontWeight: Fw.medium },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: R, borderWidth: 1, borderColor: Colors.border, paddingHorizontal: Sp.md },
  input: { flex: 1, paddingVertical: 14, fontSize: Fs.lg, color: Colors.text },
  unit: { fontSize: Fs.md, color: Colors.textMuted },
});

function OptionCard({ emoji, label, desc, active, onPress }: { emoji?: string; label: string; desc: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[ocStyles.card, active && ocStyles.active]} onPress={onPress}>
      {emoji && <Text style={ocStyles.emoji}>{emoji}</Text>}
      <View style={{ flex: 1 }}>
        <Text style={[ocStyles.label, active && ocStyles.labelActive]}>{label}</Text>
        <Text style={ocStyles.desc}>{desc}</Text>
      </View>
      {active && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
    </TouchableOpacity>
  );
}
const ocStyles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.md, borderWidth: 1, borderColor: Colors.border, gap: Sp.md },
  active: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  emoji: { fontSize: 28 },
  label: { fontSize: Fs.md, fontWeight: Fw.semibold, color: Colors.text, marginBottom: 2 },
  labelActive: { color: Colors.primary },
  desc: { fontSize: Fs.xs, color: Colors.textSecondary },
});

function MacroCell({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <View style={mcStyles.cell}>
      <Text style={[mcStyles.value, { color }]}>{value}</Text>
      <Text style={mcStyles.unit}>{unit}</Text>
      <Text style={mcStyles.label}>{label}</Text>
    </View>
  );
}
const mcStyles = StyleSheet.create({
  cell: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  value: { fontSize: Fs.xl, fontWeight: Fw.bold },
  unit: { fontSize: Fs.xs, color: Colors.textMuted },
  label: { fontSize: Fs.xs, color: Colors.textSecondary, marginTop: 2 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  progressTrack: { height: 3, backgroundColor: Colors.border },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 99 },
  scroll: { padding: Sp.lg, paddingBottom: Sp.xxl },
  bigInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: R,
    paddingHorizontal: Sp.lg, paddingVertical: 16,
    fontSize: Fs.xxl, color: Colors.text, fontWeight: Fw.semibold,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  genderRow: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.sm },
  tdeeCard: { backgroundColor: Colors.surfaceElevated, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  tdeeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tdeeLabel: { fontSize: Fs.md, color: Colors.textSecondary },
  tdeeValue: { fontSize: Fs.lg, fontWeight: Fw.bold, color: Colors.text },
  macrosGrid: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.sm },
  tdeeNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.sm, borderWidth: 1, borderColor: Colors.border },
  tdeeNoteText: { flex: 1, fontSize: Fs.xs, color: Colors.textMuted, lineHeight: 16 },
  navRow: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Sp.md, paddingVertical: 14, borderRadius: R, borderWidth: 1, borderColor: Colors.border },
  backBtnText: { fontSize: Fs.md, color: Colors.textSecondary },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: R, paddingVertical: 14 },
  nextBtnDisabled: { opacity: 0.38 },
  nextBtnText: { color: '#fff', fontSize: Fs.md, fontWeight: Fw.bold },
  // RGPD
  gdprBox: { backgroundColor: Colors.surfaceElevated, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, gap: Sp.sm },
  gdprCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Sp.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  gdprCheckText: { flex: 1, fontSize: Fs.sm, color: Colors.text, lineHeight: 20 },
  gdprLink: { color: Colors.primary, fontWeight: Fw.semibold },
  gdprInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  gdprInfoText: { flex: 1, fontSize: Fs.xs, color: Colors.textMuted, lineHeight: 17 },
  // Suppression des données
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Sp.md, borderRadius: R, borderWidth: 1, borderColor: Colors.red + '50', backgroundColor: Colors.red + '10' },
  deleteBtnText: { fontSize: Fs.sm, color: Colors.red, fontWeight: Fw.semibold },
});
