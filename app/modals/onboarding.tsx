import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Animated, Dimensions, Alert, TextStyle, StyleProp,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { User, Gender, Goal, ActivityLevel } from '../../types';
import { computeTDEE, computeTargetCalories, computeMacros } from '../../services/openai';
import { Colors, R, Sp, Fs, Fw, Fonts } from '../../constants/theme';
import Button from '../../components/ui/Button';

const TOTAL_STEPS = 6;
const SCREEN_W    = Dimensions.get('window').width;

// ─── Données de configuration ─────────────────────────────────────────────────

const GOALS: { value: Goal; emoji: string; label: string; desc: string }[] = [
  { value: 'weight_loss',  emoji: '🔥', label: 'Perdre du poids',      desc: 'Déficit calorique, brûle les graisses' },
  { value: 'muscle_gain',  emoji: '💪', label: 'Prendre de la masse',  desc: 'Surplus calorique, construis du muscle' },
  { value: 'maintenance',  emoji: '⚖️', label: 'Maintenir',            desc: 'Équilibre, garde ta forme actuelle' },
];

const ACTIVITIES: { value: ActivityLevel; emoji: string; label: string; desc: string }[] = [
  { value: 'sedentary',   emoji: '🛋️', label: 'Sédentaire',           desc: 'Bureau, peu ou pas de sport' },
  { value: 'light',       emoji: '🚶', label: 'Légèrement actif',      desc: '1-2 entraînements/sem.' },
  { value: 'moderate',    emoji: '🏃', label: 'Modérément actif',      desc: '3-4 entraînements/sem.' },
  { value: 'active',      emoji: '⚡', label: 'Actif',                 desc: '5 entraînements/sem.' },
  { value: 'very_active', emoji: '🏋️', label: 'Très actif',           desc: 'Sport quotidien ou physique' },
];

// ─── CountUp component ────────────────────────────────────────────────────────

function CountUpText({ to, style }: { to: number; style?: StyleProp<TextStyle> }) {
  const [val, setVal] = useState(0);
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, { toValue: to, duration: 1200, useNativeDriver: false }).start();
    const id = anim.addListener(({ value }) => setVal(Math.round(value)));
    return () => anim.removeListener(id);
  }, [to]);
  return <Text style={style}>{val}</Text>;
}

// ─── SliderInput component ────────────────────────────────────────────────────

function SliderInput({ label, value, onChange, min, max, unit, step = 1 }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; unit: string; step?: number;
}) {
  const [trackW, setTrackW] = useState(1);
  const ratio = (value - min) / (max - min);

  const handleResponder = (e: { nativeEvent: { locationX: number } }) => {
    const x = Math.max(0, Math.min(e.nativeEvent.locationX, trackW));
    const raw = min + (x / trackW) * (max - min);
    const stepped = Math.round(raw / step) * step;
    onChange(Math.max(min, Math.min(max, parseFloat(stepped.toFixed(1)))));
  };

  return (
    <View style={slS.container}>
      <View style={slS.header}>
        <Text style={slS.label}>{label}</Text>
        <Text style={slS.bigVal}>{value}<Text style={slS.unit}> {unit}</Text></Text>
      </View>
      <View
        style={slS.trackWrap}
        onLayout={e => setTrackW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={handleResponder}
        onResponderMove={handleResponder}
      >
        <View style={slS.track}>
          <View style={[slS.fill, { width: `${ratio * 100}%` }]} />
        </View>
        <View style={[slS.thumb, { left: Math.max(0, ratio * trackW - 14) }]} />
      </View>
      <View style={slS.minMax}>
        <Text style={slS.minMaxTxt}>{min}</Text>
        <Text style={slS.minMaxTxt}>{max}</Text>
      </View>
    </View>
  );
}
const slS = StyleSheet.create({
  container: { marginBottom: Sp.lg },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Sp.sm },
  label: { fontSize: Fs.sm, color: Colors.textSecondary, fontFamily: Fonts.medium },
  bigVal: { fontSize: 32, fontFamily: Fonts.heavy, color: Colors.text },
  unit: { fontSize: Fs.md, color: Colors.textMuted, fontFamily: Fonts.regular },
  trackWrap: { height: 28, justifyContent: 'center', position: 'relative' },
  track: { height: 4, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 2, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 2 },
  thumb: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.primary, top: 0, shadowColor: Colors.primary, shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  minMax: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  minMaxTxt: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
});

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingModal() {
  const router   = useRouter();
  const params   = useLocalSearchParams();
  const store    = useAppStore();
  const existing = store.user;

  const initialStep = params.step ? Math.max(0, Math.min(parseInt(params.step as string), TOTAL_STEPS - 1)) : 0;
  const [step,         setStep]         = useState(initialStep);
  const [name,         setName]         = useState(existing?.name     ?? '');
  const [gender,       setGender]       = useState<Gender>(existing?.gender   ?? 'male');
  const [age,          setAge]          = useState<number>(existing?.age      ?? 25);
  const [height,       setHeight]       = useState<number>(existing?.height   ?? 175);
  const [weight,       setWeight]       = useState<number>(existing?.weight   ?? 75);
  const [goal,         setGoal]         = useState<Goal>(existing?.goal       ?? 'maintenance');
  const [activity,     setActivity]     = useState<ActivityLevel>(existing?.activityLevel ?? 'moderate');
  // RGPD : pré-coché si l'utilisateur a déjà accepté (édition de profil)
  const [gdprAccepted, setGdprAccepted] = useState(!!existing?.gdprAcceptedAt);

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  // Welcome emoji scale
  const emojiScale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (step === 0) {
      Animated.spring(emojiScale, { toValue: 1.0, useNativeDriver: true, tension: 80, friction: 8 }).start();
    }
  }, []);

  // Calculs TDEE affichés à l'étape 5
  const tdee = computeTDEE(gender, weight, height, age, activity);
  const targetCal = computeTargetCalories(tdee, goal);
  const macros    = computeMacros(targetCal, weight);

  const canNext = (): boolean => {
    if (step === 0) return true;
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return age >= 15 && height >= 140 && weight >= 40;
    if (step === 3 || step === 4) return true;
    if (step === 5) return gdprAccepted;
    return true;
  };

  const animateNext = (newStep: number) => {
    Animated.timing(slideAnim, { toValue: -SCREEN_W, duration: 200, useNativeDriver: true })
      .start(() => {
        setStep(newStep);
        slideAnim.setValue(SCREEN_W);
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      });
  };

  const animatePrev = (newStep: number) => {
    Animated.timing(slideAnim, { toValue: SCREEN_W, duration: 200, useNativeDriver: true })
      .start(() => {
        setStep(newStep);
        slideAnim.setValue(-SCREEN_W);
        Animated.timing(slideAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
      });
  };

  const goNext = () => animateNext(Math.min(step + 1, TOTAL_STEPS - 1));
  const goPrev = () => animatePrev(Math.max(step - 1, 0));

  const handleFinish = async () => {
    const user: User = {
      id: existing?.id ?? '1',
      name: name.trim(),
      gender,
      age,
      height,
      weight,
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

  const progressWidth = step === 0 ? 0 : (step / (TOTAL_STEPS - 1)) * 100;

  return (
    <View style={styles.container}>
      {/* Barre de progression (masquée sur step 0) */}
      {step > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressWidth}%` }]} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>

          {/* ── Step 0 : Welcome ────────────────────────────────────────── */}
          {step === 0 && (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeContent}>
                <Animated.Text style={[styles.welcomeEmoji, { transform: [{ scale: emojiScale }] }]}>
                  💪
                </Animated.Text>
                <Text style={styles.welcomeTitle}>{'Bienvenue sur\nFitTrack IA'}</Text>
                <Text style={styles.welcomeTagline}>{'Ton coach IA. Tes données.\nTa transformation.'}</Text>

                {/* Vitrine de valeur : on montre ce qu'on apporte avant de demander */}
                <View style={styles.welcomeFeatures}>
                  {[
                    { icon: 'sparkles' as const,        title: 'Coach IA personnalisé',   sub: 'Analyse sport + nutrition, conseils sur-mesure' },
                    { icon: 'barbell' as const,         title: 'Séances & records',        sub: 'Surcharge progressive, PRs, 100+ exercices' },
                    { icon: 'restaurant' as const,      title: 'Nutrition sans effort',    sub: 'Scan code-barres, macros, plans de repas' },
                    { icon: 'trending-up' as const,     title: 'Progrès visibles',         sub: 'Poids, mensurations, photos, badges' },
                  ].map(f => (
                    <View key={f.title} style={styles.welcomeFeatureRow}>
                      <View style={styles.welcomeFeatureIcon}>
                        <Ionicons name={f.icon} size={18} color={Colors.primary} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.welcomeFeatureTitle}>{f.title}</Text>
                        <Text style={styles.welcomeFeatureSub}>{f.sub}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <View style={styles.welcomeActions}>
                <Button
                  title="Commencer →"
                  onPress={goNext}
                  size="lg"
                  fullWidth={false}
                  style={{ alignSelf: 'center', paddingHorizontal: 48 }}
                />
                <TouchableOpacity onPress={() => router.push('/modals/privacy-policy')}>
                  <Text style={styles.legalText}>En continuant, tu acceptes notre politique de confidentialité</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Step 1 : Identité ───────────────────────────────────────── */}
          {step === 1 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Comment tu t'appelles ?</Text>
              <View style={{ gap: Sp.md, marginTop: Sp.lg }}>
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
                <Text style={styles.subLabel}>Genre</Text>
                <View style={styles.genderRow}>
                  <GenderBtn value="male"   label="Homme" emoji="👨" active={gender === 'male'}   onPress={() => setGender('male')} />
                  <GenderBtn value="female" label="Femme"  emoji="👩" active={gender === 'female'} onPress={() => setGender('female')} />
                </View>
              </View>
            </View>
          )}

          {/* ── Step 2 : Mesures ────────────────────────────────────────── */}
          {step === 2 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Tes données physiques</Text>
              <Text style={styles.stepSubtitle}>Utilisées pour calculer ton métabolisme</Text>
              <View style={{ marginTop: Sp.xl }}>
                <SliderInput label="Âge"    value={age}    onChange={setAge}    min={15} max={80}  unit="ans" step={1}   />
                <SliderInput label="Taille" value={height} onChange={setHeight} min={140} max={220} unit="cm"  step={1}   />
                <SliderInput label="Poids"  value={weight} onChange={setWeight} min={40} max={150} unit="kg"  step={0.5} />
              </View>
            </View>
          )}

          {/* ── Step 3 : Objectif ───────────────────────────────────────── */}
          {step === 3 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Quel est ton objectif ?</Text>
              <Text style={styles.stepSubtitle}>On adapte tes calories en conséquence</Text>
              <View style={{ gap: Sp.sm, marginTop: Sp.lg }}>
                {GOALS.map(g => (
                  <TouchableOpacity
                    key={g.value}
                    style={[styles.goalCard, goal === g.value && styles.goalCardActive]}
                    onPress={() => setGoal(g.value)}
                  >
                    <Text style={styles.goalEmoji}>{g.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.goalLabel, goal === g.value && styles.goalLabelActive]}>{g.label}</Text>
                      <Text style={styles.goalDesc}>{g.desc}</Text>
                    </View>
                    {goal === g.value && <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 4 : Activité ───────────────────────────────────────── */}
          {step === 4 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Ton niveau d'activité</Text>
              <Text style={styles.stepSubtitle}>Entraînements par semaine hors travail</Text>
              <View style={{ gap: Sp.sm, marginTop: Sp.lg }}>
                {ACTIVITIES.map(a => (
                  <TouchableOpacity
                    key={a.value}
                    style={[styles.actCard, activity === a.value && styles.actCardActive]}
                    onPress={() => setActivity(a.value)}
                  >
                    <Text style={styles.actEmoji}>{a.emoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.actLabel, activity === a.value && styles.actLabelActive]}>{a.label}</Text>
                      <Text style={styles.actDesc}>{a.desc}</Text>
                    </View>
                    {activity === a.value && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* ── Step 5 : Récapitulatif + RGPD ──────────────────────────── */}
          {step === 5 && (
            <View style={styles.stepContainer}>
              <Text style={styles.stepTitle}>Ton plan personnalisé 🔥</Text>
              <Text style={styles.stepSubtitle}>Calculé avec Harris-Benedict</Text>

              {/* TDEE card avec count-up */}
              <View style={styles.tdeeCard}>
                <View style={styles.tdeeRow}>
                  <Text style={styles.tdeeLabel}>TDEE (maintenance)</Text>
                  <View style={styles.tdeeValueRow}>
                    <CountUpText to={tdee} style={styles.tdeeValue} />
                    <Text style={styles.tdeeValueUnit}> kcal</Text>
                  </View>
                </View>
                <View style={[styles.tdeeRow, { borderBottomWidth: 0 }]}>
                  <Text style={styles.tdeeLabel}>Cible journalière</Text>
                  <View style={styles.tdeeValueRow}>
                    <CountUpText to={targetCal} style={[styles.tdeeValue, { color: Colors.primary }]} />
                    <Text style={[styles.tdeeValueUnit, { color: Colors.primary }]}> kcal</Text>
                  </View>
                </View>
              </View>

              {/* Macros grid avec count-up */}
              <View style={styles.macrosGrid}>
                <View style={[styles.macroCell, { borderColor: Colors.proteinColor + '40' }]}>
                  <CountUpText to={macros.protein} style={[styles.macroCellValue, { color: Colors.proteinColor }]} />
                  <Text style={styles.macroCellUnit}>g</Text>
                  <Text style={styles.macroCellLabel}>Protéines</Text>
                </View>
                <View style={[styles.macroCell, { borderColor: Colors.carbsColor + '40' }]}>
                  <CountUpText to={macros.carbs} style={[styles.macroCellValue, { color: Colors.carbsColor }]} />
                  <Text style={styles.macroCellUnit}>g</Text>
                  <Text style={styles.macroCellLabel}>Glucides</Text>
                </View>
                <View style={[styles.macroCell, { borderColor: Colors.fatColor + '40' }]}>
                  <CountUpText to={macros.fat} style={[styles.macroCellValue, { color: Colors.fatColor }]} />
                  <Text style={styles.macroCellUnit}>g</Text>
                  <Text style={styles.macroCellLabel}>Lipides</Text>
                </View>
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
                    {gdprAccepted && <Ionicons name="checkmark" size={14} color={Colors.onPrimary} />}
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

              {/* ── DEV ONLY : Réinitialiser l'onboarding ──────────────── */}
              {__DEV__ && (
                <TouchableOpacity
                  style={styles.devResetBtn}
                  onPress={() => Alert.alert(
                    '🛠 Réinitialiser l\'onboarding',
                    'Supprime le profil et l\'état du tutoriel pour retester le flux complet.',
                    [
                      { text: 'Annuler', style: 'cancel' },
                      {
                        text: 'Réinitialiser',
                        onPress: async () => {
                          await store.resetOnboarding();
                          router.replace('/modals/onboarding');
                        },
                      },
                    ],
                  )}
                >
                  <Ionicons name="refresh-outline" size={15} color={Colors.orange} />
                  <Text style={styles.devResetBtnText}>DEV — Réinitialiser l'onboarding</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

        </Animated.View>

        {/* ── Navigation ───────────────────────────────────────────────── */}
        {step > 0 && (
          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backBtn} onPress={goPrev}>
              <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
              <Text style={styles.backBtnText}>Retour</Text>
            </TouchableOpacity>
            <Button
              title={step < TOTAL_STEPS - 1 ? 'Suivant →' : "C'est parti 🚀"}
              onPress={step < TOTAL_STEPS - 1 ? goNext : handleFinish}
              disabled={!canNext()}
              fullWidth={false}
              style={{ flex: 1 }}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

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
  emoji: { fontSize: 48, fontFamily: Fonts.regular },
  label: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.textSecondary },
  labelActive: { color: Colors.primary },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  progressTrack: { height: 3, backgroundColor: Colors.border },
  progressFill: { height: '100%', backgroundColor: Colors.primary, borderRadius: 99 },
  scroll: { padding: Sp.lg, paddingBottom: Sp.xxl, flexGrow: 1 },

  // Welcome
  welcomeContainer: { flex: 1, justifyContent: 'space-between', minHeight: 500, paddingTop: Sp.xxl },
  welcomeContent: { alignItems: 'center', gap: Sp.lg },
  welcomeEmoji: { fontSize: 80, fontFamily: Fonts.regular },
  welcomeTitle: { fontSize: 36, fontFamily: Fonts.heavy, color: Colors.text, textAlign: 'center', lineHeight: 44 },
  welcomeTagline: { fontSize: 16, fontFamily: Fonts.regular, color: Colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  welcomeFeatures: { alignSelf: 'stretch', gap: Sp.sm, marginTop: Sp.md },
  welcomeFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: Sp.md, backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md },
  welcomeFeatureIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  welcomeFeatureTitle: { fontSize: Fs.sm, fontFamily: Fonts.semibold, color: Colors.text },
  welcomeFeatureSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },
  welcomeActions: { gap: Sp.md, alignItems: 'center', paddingBottom: Sp.lg },
  startBtn: { backgroundColor: Colors.primary, borderRadius: R, paddingVertical: 16, paddingHorizontal: 48, alignSelf: 'center' },
  startBtnText: { color: Colors.onPrimary, fontSize: Fs.lg, fontFamily: Fonts.bold },
  legalText: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', textDecorationLine: 'underline' },

  // Steps
  stepContainer: { paddingTop: Sp.xl },
  stepTitle: { fontSize: Fs.xxl, fontFamily: Fonts.heavy, color: Colors.text, marginBottom: 6 },
  stepSubtitle: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textSecondary },
  subLabel: { fontSize: Fs.sm, color: Colors.textSecondary, fontFamily: Fonts.medium, marginTop: Sp.sm },

  // Identity
  bigInput: {
    backgroundColor: Colors.surfaceElevated, borderRadius: R,
    paddingHorizontal: Sp.lg, paddingVertical: 16,
    fontSize: Fs.xxl, color: Colors.text, fontFamily: Fonts.semibold,
    borderWidth: 1, borderColor: Colors.border, textAlign: 'center',
  },
  genderRow: { flexDirection: 'row', gap: Sp.sm },

  // Goals
  goalCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.md, borderWidth: 1, borderColor: Colors.border, gap: Sp.md },
  goalCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  goalEmoji: { fontSize: 56, fontFamily: Fonts.regular },
  goalLabel: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text, marginBottom: 2 },
  goalLabelActive: { color: Colors.primary },
  goalDesc: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },

  // Activities
  actCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.md, borderWidth: 1, borderColor: Colors.border, gap: Sp.md },
  actCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  actEmoji: { fontSize: 28, fontFamily: Fonts.regular },
  actLabel: { fontSize: Fs.md, fontFamily: Fonts.semibold, color: Colors.text, marginBottom: 2 },
  actLabelActive: { color: Colors.primary },
  actDesc: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },

  // Summary
  tdeeCard: { backgroundColor: Colors.surfaceElevated, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginTop: Sp.lg },
  tdeeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tdeeLabel: { fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.textSecondary },
  tdeeValueRow: { flexDirection: 'row', alignItems: 'baseline' },
  tdeeValue: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  tdeeValueUnit: { fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.textMuted },
  macrosGrid: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.sm },
  macroCell: { flex: 1, backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.md, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  macroCellValue: { fontSize: Fs.xl, fontFamily: Fonts.bold },
  macroCellUnit: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  macroCellLabel: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 2 },
  tdeeNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.surfaceElevated, borderRadius: R, padding: Sp.sm, borderWidth: 1, borderColor: Colors.border, marginTop: Sp.sm },
  tdeeNoteText: { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 16 },

  // RGPD
  gdprBox: { backgroundColor: Colors.surfaceElevated, borderRadius: R, borderWidth: 1, borderColor: Colors.border, padding: Sp.md, gap: Sp.sm, marginTop: Sp.md },
  gdprCheckRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Sp.sm },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  gdprCheckText: { flex: 1, fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.text, lineHeight: 20 },
  gdprLink: { color: Colors.primary, fontFamily: Fonts.semibold },
  gdprInfo: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  gdprInfoText: { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 17 },

  // Delete
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: Sp.md, borderRadius: R, borderWidth: 1, borderColor: Colors.red + '50', backgroundColor: Colors.red + '10', marginTop: Sp.md },
  deleteBtnText: { fontSize: Fs.sm, color: Colors.red, fontFamily: Fonts.semibold },

  // Dev reset (visible uniquement en __DEV__)
  devResetBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: R, borderWidth: 1, borderColor: Colors.orange + '50', backgroundColor: Colors.orange + '08', marginTop: Sp.sm },
  devResetBtnText: { fontSize: Fs.xs, color: Colors.orange, fontFamily: Fonts.medium },

  // Navigation
  navRow: { flexDirection: 'row', gap: Sp.sm, marginTop: Sp.xl },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Sp.md, paddingVertical: 14, borderRadius: R, borderWidth: 1, borderColor: Colors.border },
  backBtnText: { fontSize: Fs.md, fontFamily: Fonts.regular, color: Colors.textSecondary },
  nextBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: R, paddingVertical: 14 },
  nextBtnDisabled: { opacity: 0.38 },
  nextBtnText: { color: Colors.onPrimary, fontSize: Fs.md, fontFamily: Fonts.bold },
});
