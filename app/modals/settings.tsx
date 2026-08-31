import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Alert, Switch, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '../../store/useAppStore';
import { computeTDEE, computeTargetCalories, computeMacros, setRuntimeApiKey, isValidApiKey, CoachPersona, setCoachPersona, getCoachPersona } from '../../services/openai';
import { loadApiKey, saveApiKey, clearApiKey, loadNotifPrefs, saveNotifPrefs } from '../../services/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scheduleAllReminders } from '../../services/notifications';
import { createBackup, decryptBackup, restoreBackup } from '../../services/backup';
import { isHealthAvailable, isHealthSyncEnabled, enableHealthSync, disableHealthSync } from '../../services/health';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { isLockEnabled, setLockEnabled, canUseLock, biometricLabel, authenticate } from '../../services/applock';
import { Colors, R, Sp, Fs, Fw, Fonts , tapSlop } from '../../constants/theme';
import Button from '../../components/ui/Button';
import { ActivityLevel, NotifPrefs } from '../../types';

const ACTIVITY_OPTS: { value: ActivityLevel; emoji: string; short: string }[] = [
  { value: 'sedentary',   emoji: '🛋️', short: 'Séd.' },
  { value: 'light',       emoji: '🚶', short: 'Léger' },
  { value: 'moderate',    emoji: '🏃', short: 'Modéré' },
  { value: 'active',      emoji: '⚡', short: 'Actif' },
  { value: 'very_active', emoji: '🏋️', short: 'T.actif' },
];

const GOAL_LABELS: Record<string, string> = {
  weight_loss: 'Perte de poids 🔥',
  muscle_gain: 'Prise de masse 💪',
  maintenance: 'Maintien ⚖️',
};

// ─── Sous-composants ──────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function RowLink({ icon, label, sublabel, onPress, danger }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sublabel?: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={17} color={danger ? Colors.red : Colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={[styles.rowLabel, danger && { color: Colors.red }]}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={15} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

function RowToggle({ icon, label, sublabel, value, onToggle }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  sublabel?: string;
  value: boolean;
  onToggle: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={17} color={Colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        {sublabel && <Text style={styles.rowSublabel}>{sublabel}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.border, true: Colors.primary + '55' }}
        thumbColor={value ? Colors.primary : (Platform.OS === 'android' ? Colors.surfaceElevated : undefined)}
        ios_backgroundColor={Colors.border}
      />
    </View>
  );
}

function MacroInput({ label, value, onChange, color }: {
  label: string; value: string; onChange: (v: string) => void; color: string;
}) {
  return (
    <View style={styles.macroInputWrap}>
      <Text style={[styles.macroInputLabel, { color }]}>{label}</Text>
      <View style={[styles.macroInputRow, { borderColor: color + '40' }]}>
        <TextInput
          style={[styles.macroInput, { color }]}
          value={value}
          onChangeText={onChange}
          keyboardType="number-pad"
          selectTextOnFocus
          accessibilityLabel={`Objectif ${label}`}
        />
        <Text style={styles.macroUnit}>g</Text>
      </View>
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router = useRouter();
  const store  = useAppStore();
  const user   = store.user;

  // ── Objectifs (édition locale) ───────────────────────────────────────────
  const [targetCalories, setTargetCalories] = useState(String(user?.targetCalories ?? 2000));
  const [targetProtein,  setTargetProtein]  = useState(String(user?.targetProtein  ?? 150));
  const [targetCarbs,    setTargetCarbs]    = useState(String(user?.targetCarbs    ?? 200));
  const [targetFat,      setTargetFat]      = useState(String(user?.targetFat      ?? 70));
  const [activityLevel,  setActivityLevel]  = useState<ActivityLevel>(user?.activityLevel ?? 'moderate');
  const [objSaved,       setObjSaved]       = useState(false);

  // ── Notifications ────────────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ meals: true, workout: true, weekly: true, water: true });

  // ── Clé API ──────────────────────────────────────────────────────────────
  const [apiKey,        setApiKey]        = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [apiKeySaved,   setApiKeySaved]   = useState(false);

  // ── Options avancées repliées (clé API) ──────────────────────────────────
  const [showAdvanced, setShowAdvanced] = useState(false);

  // ── Persona Coach IA ──────────────────────────────────────────────────────
  const [persona, setPersona] = useState<CoachPersona>('motivateur');

  // ── Verrou biométrique ───────────────────────────────────────────────────
  const [lockEnabled,   setLockEnabledState] = useState(false);
  const [lockAvailable, setLockAvailable]    = useState(true);
  const [bioLabel,      setBioLabel]         = useState('Face ID');

  // ── Apple Health ─────────────────────────────────────────────────────────
  const [healthSync, setHealthSync] = useState(false);
  useEffect(() => { isHealthSyncEnabled().then(setHealthSync); }, []);

  useEffect(() => {
    loadApiKey().then(k => { if (k) setApiKey(k); });
    loadNotifPrefs().then(p => setNotifPrefs(p));
    isLockEnabled().then(setLockEnabledState);
    canUseLock().then(setLockAvailable);
    biometricLabel().then(setBioLabel);
    AsyncStorage.getItem('@fit_coach_persona').then(v => {
      if (v) { setPersona(v as CoachPersona); setCoachPersona(v as CoachPersona); }
    });
  }, []);

  // ── Activer / désactiver le verrou ───────────────────────────────────────
  const handleToggleLock = useCallback(async (on: boolean) => {
    if (on && !(await canUseLock())) {
      Alert.alert(
        'Impossible d\'activer',
        'Configure d\'abord Face ID, Touch ID ou un code sur ton iPhone (Réglages iOS).',
      );
      return;
    }
    // On vérifie l'identité dans les deux sens : activer ET désactiver
    if (!(await authenticate())) return;
    await setLockEnabled(on);
    setLockEnabledState(on);
  }, []);

  // ── Sauvegarder les objectifs ────────────────────────────────────────────
  const handleSaveObjectives = useCallback(async () => {
    if (!user) return;
    const cal  = Math.max(1, parseInt(targetCalories) || user.targetCalories);
    const prot = Math.max(0, parseInt(targetProtein)  || user.targetProtein);
    const carb = Math.max(0, parseInt(targetCarbs)    || user.targetCarbs);
    const fat  = Math.max(0, parseInt(targetFat)      || user.targetFat);
    await store.setUser({ ...user, targetCalories: cal, targetProtein: prot, targetCarbs: carb, targetFat: fat, activityLevel });
    setObjSaved(true);
    setTimeout(() => setObjSaved(false), 2000);
  }, [user, targetCalories, targetProtein, targetCarbs, targetFat, activityLevel, store]);

  // ── Recalculer TDEE ──────────────────────────────────────────────────────
  const handleRecalculate = useCallback(async () => {
    if (!user) return;
    const newTdee   = computeTDEE(user.gender, user.weight, user.height, user.age, activityLevel);
    const newCal    = computeTargetCalories(newTdee, user.goal);
    const newMacros = computeMacros(newCal, user.weight);
    setTargetCalories(String(newCal));
    setTargetProtein(String(newMacros.protein));
    setTargetCarbs(String(newMacros.carbs));
    setTargetFat(String(newMacros.fat));
    await store.setUser({ ...user, tdee: newTdee, targetCalories: newCal, targetProtein: newMacros.protein, targetCarbs: newMacros.carbs, targetFat: newMacros.fat, activityLevel });
    Alert.alert('✅ Recalculé !', `TDEE : ${newTdee} kcal/j → Cible : ${newCal} kcal/j`);
  }, [user, activityLevel, store]);

  // ── Toggles notifications ─────────────────────────────────────────────────
  const handleNotifToggle = useCallback(async (key: keyof NotifPrefs, value: boolean) => {
    const newPrefs = { ...notifPrefs, [key]: value };
    setNotifPrefs(newPrefs);
    await saveNotifPrefs(newPrefs);
    await scheduleAllReminders(newPrefs);
  }, [notifPrefs]);

  // ── Sauvegarder la clé API ────────────────────────────────────────────────
  const handleSaveApiKey = useCallback(async () => {
    const trimmed = apiKey.trim();
    if (trimmed) {
      if (!isValidApiKey(trimmed)) {
        Alert.alert('Clé invalide', 'Une clé OpenAI commence par « sk- ». Vérifie ta saisie.');
        return;
      }
      await saveApiKey(trimmed);
      setRuntimeApiKey(trimmed);
    } else {
      await clearApiKey();
      setRuntimeApiKey('');
    }
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  }, [apiKey]);

  // ── Exporter les données ──────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    Alert.prompt(
      'Sauvegarde chiffrée',
      'Choisis un mot de passe (8 caractères min). Il sera demandé pour restaurer — ne le perds pas, il n\'est stocké nulle part.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Exporter',
          onPress: async (pass?: string) => {
            if (!pass || pass.length < 8) {
              Alert.alert('Mot de passe trop court', '8 caractères minimum.');
              return;
            }
            try {
              const { uri, entryCount } = await createBackup(pass);
              if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, { dialogTitle: 'Enregistrer la sauvegarde FitTrack IA' });
              }
              Alert.alert('✅ Sauvegarde créée', `${entryCount} catégories de données exportées.\n\nConserve le fichier dans iCloud Drive ou Fichiers.`);
            } catch (e: any) {
              Alert.alert('Export impossible', e?.message ?? 'Réessaie plus tard.');
            }
          },
        },
      ],
      'secure-text',
    );
  }, []);

  const handleImport = useCallback(async () => {
    const picked = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (picked.canceled || !picked.assets?.[0]?.uri) return;
    let content = '';
    try {
      content = await FileSystem.readAsStringAsync(picked.assets[0].uri);
    } catch {
      Alert.alert('Fichier illisible', 'Impossible de lire ce fichier.');
      return;
    }
    Alert.prompt(
      'Restaurer la sauvegarde',
      'Mot de passe de la sauvegarde :',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Continuer',
          onPress: (pass?: string) => {
            if (!pass) return;
            try {
              const { info, data } = decryptBackup(content, pass);
              const when = info.exportedAt ? new Date(info.exportedAt).toLocaleDateString('fr-FR') : 'date inconnue';
              Alert.alert(
                'Confirmer la restauration',
                `Sauvegarde du ${when} — ${info.entryCount} catégories.\n\n⚠️ Les données actuelles de ces catégories seront remplacées.`,
                [
                  { text: 'Annuler', style: 'cancel' },
                  {
                    text: 'Restaurer',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await restoreBackup(data);
                        await store.refresh();
                        Alert.alert('✅ Données restaurées', 'Toutes tes données ont été rechargées.');
                      } catch (e: any) {
                        Alert.alert('Restauration impossible', e?.message ?? 'Réessaie plus tard.');
                      }
                    },
                  },
                ],
              );
            } catch (e: any) {
              Alert.alert('Erreur', e?.message ?? 'Mot de passe incorrect.');
            }
          },
        },
      ],
      'secure-text',
    );
  }, [store]);

  if (!user) return null;

  const initiale = user.name?.trim() ? user.name[0].toUpperCase() : '?';
  const isDemoMode = !apiKey.trim() && !process.env.EXPO_PUBLIC_OPENAI_KEY;

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} accessibilityLabel="Retour" accessibilityRole="button" hitSlop={tapSlop}>
          <Ionicons name="arrow-back" size={20} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* ── PREMIUM ─────────────────────────────────────────────────── */}
        {store.isPremium ? (
          <View style={styles.premiumActive}>
            <Text style={{ fontSize: 22 }}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumActiveTitle}>FitTrack Premium actif</Text>
              <Text style={styles.premiumActiveSub}>Merci de ton soutien ! Toutes les fonctions IA sont débloquées.</Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.premiumCard} onPress={() => router.push('/modals/paywall')} activeOpacity={0.9} accessibilityRole="button" accessibilityLabel="Passer à FitTrack Premium">
            <Text style={{ fontSize: 26 }}>👑</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.premiumCardTitle}>Passer à FitTrack Premium</Text>
              <Text style={styles.premiumCardSub}>Coach IA illimité, plans de repas & programmes IA</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={Colors.onPrimary} />
          </TouchableOpacity>
        )}

        {/* ── PROFIL ──────────────────────────────────────────────────── */}
        <SectionHeader title="PROFIL" />
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.profileAvatar}>
              <Text style={styles.profileInitiale}>{initiale}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user.name}</Text>
              <Text style={styles.profileStats}>{user.age} ans · {user.height} cm · {user.weight} kg</Text>
              <View style={styles.goalBadge}>
                <Text style={styles.goalBadgeText}>{GOAL_LABELS[user.goal] ?? user.goal}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            style={styles.editProfileBtn}
            onPress={() => router.push({ pathname: '/modals/onboarding', params: { step: '1' } })}
            accessibilityRole="button"
            accessibilityLabel="Modifier mon profil"
          >
            <Ionicons name="create-outline" size={15} color={Colors.primary} />
            <Text style={styles.editProfileBtnText}>Modifier mon profil</Text>
          </TouchableOpacity>
        </View>

        {/* ── OBJECTIFS ───────────────────────────────────────────────── */}
        <SectionHeader title="OBJECTIFS" />
        <View style={styles.card}>
          {/* Calories */}
          <View style={styles.calRow}>
            <Text style={styles.calLabel}>Calories objectif</Text>
            <View style={styles.calInputRow}>
              <TextInput
                style={styles.calInput}
                value={targetCalories}
                onChangeText={setTargetCalories}
                keyboardType="number-pad"
                selectTextOnFocus
                accessibilityLabel="Calories objectif"
              />
              <Text style={styles.calUnit}>kcal/j</Text>
            </View>
          </View>

          {/* Macros */}
          <View style={styles.macrosRow}>
            <MacroInput label="Protéines" value={targetProtein} onChange={setTargetProtein} color={Colors.proteinColor} />
            <MacroInput label="Glucides"  value={targetCarbs}   onChange={setTargetCarbs}   color={Colors.carbsColor} />
            <MacroInput label="Lipides"   value={targetFat}     onChange={setTargetFat}     color={Colors.fatColor} />
          </View>

          {/* Niveau d'activité */}
          <Text style={styles.fieldLabel}>Niveau d'activité</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.actScroll} contentContainerStyle={styles.actScrollContent}>
            {ACTIVITY_OPTS.map(a => (
              <TouchableOpacity accessibilityRole="button"
                key={a.value}
                style={[styles.actChip, activityLevel === a.value && styles.actChipActive]}
                onPress={() => setActivityLevel(a.value)}
              >
                <Text style={styles.actChipEmoji}>{a.emoji}</Text>
                <Text style={[styles.actChipText, activityLevel === a.value && styles.actChipTextActive]}>{a.short}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.objBtnsRow}>
            <TouchableOpacity accessibilityRole="button" style={styles.recalcBtn} onPress={handleRecalculate}>
              <Ionicons name="refresh-outline" size={15} color={Colors.primary} />
              <Text style={styles.recalcBtnText}>Recalculer avec Harris-Benedict</Text>
            </TouchableOpacity>
            <Button
              title={objSaved ? '✓ Sauvegardé' : 'Sauvegarder'}
              onPress={handleSaveObjectives}
              fullWidth={false}
            />
          </View>
        </View>

        {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
        <SectionHeader title="NOTIFICATIONS" />
        <View style={styles.card}>
          <RowToggle
            icon="restaurant-outline"
            label="Rappel repas"
            sublabel="12h et 19h"
            value={notifPrefs.meals}
            onToggle={v => handleNotifToggle('meals', v)}
          />
          <View style={styles.divider} />
          <RowToggle
            icon="barbell-outline"
            label="Rappel séance"
            sublabel="Vendredi 17h"
            value={notifPrefs.workout}
            onToggle={v => handleNotifToggle('workout', v)}
          />
          <View style={styles.divider} />
          <RowToggle
            icon="bar-chart-outline"
            label="Bilan hebdomadaire"
            sublabel="Dimanche 20h"
            value={notifPrefs.weekly}
            onToggle={v => handleNotifToggle('weekly', v)}
          />
          <View style={styles.divider} />
          <RowToggle
            icon="water-outline"
            label="Rappel hydratation"
            sublabel="10h, 14h, 16h et 21h"
            value={notifPrefs.water}
            onToggle={v => handleNotifToggle('water', v)}
          />
        </View>

        {/* ── COACH IA ─────────────────────────────────────────────────── */}
        <SectionHeader title="COACH IA" />
        <View style={styles.card}>
          {/* Sélecteur persona */}
          <Text style={styles.fieldLabel}>Personnalité du coach</Text>
          <View style={{ gap: Sp.xs, paddingHorizontal: Sp.md, paddingBottom: Sp.md }}>
            {([
              { id: 'motivateur',   label: '🔥 Motivateur',   desc: 'Énergique, phrases courtes, emojis' },
              { id: 'scientifique', label: '📊 Scientifique',  desc: 'Données précises, ton neutre' },
              { id: 'bienveillant', label: '🤝 Bienveillant',  desc: 'Doux, empathique, encourageant' },
              { id: 'militaire',    label: '💂 Militaire',     desc: 'Direct, discipline, sans pitié' },
            ] as const).map(p => (
              <TouchableOpacity accessibilityRole="button"
                key={p.id}
                style={[{ flexDirection: 'row', alignItems: 'center', gap: Sp.sm, paddingVertical: 10, paddingHorizontal: Sp.sm, borderRadius: R, borderWidth: 1, borderColor: persona === p.id ? Colors.primary : Colors.border, backgroundColor: persona === p.id ? Colors.primary + '12' : Colors.surfaceElevated }]}
                onPress={async () => {
                  setPersona(p.id as CoachPersona);
                  setCoachPersona(p.id as CoachPersona);
                  await AsyncStorage.setItem('@fit_coach_persona', p.id);
                }}
              >
                <Text style={{ flex: 1, fontSize: Fs.sm, color: persona === p.id ? Colors.primary : Colors.text, fontFamily: Fonts.medium }}>{p.label}</Text>
                <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted }}>{p.desc}</Text>
                {persona === p.id && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>

          {/* Options avancées : clé API repliée (technique, rarement utile) */}
          {isDemoMode && (
            <View style={styles.demoBanner}>
              <Ionicons name="warning-outline" size={14} color={Colors.orange} />
              <Text style={styles.demoBannerText}>Mode démo actif — ouvre les options avancées pour entrer ta clé API</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced(v => !v)}
            accessibilityRole="button"
            accessibilityLabel={showAdvanced ? 'Masquer les options avancées' : 'Afficher les options avancées'}
          >
            <Ionicons name="construct-outline" size={15} color={Colors.textSecondary} />
            <Text style={styles.advancedToggleText}>Options avancées (clé API)</Text>
            <Ionicons name={showAdvanced ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
          </TouchableOpacity>
          {showAdvanced && (
            <>
              <Text style={styles.fieldLabel}>Clé API OpenAI</Text>
              <View style={styles.apiKeyRow}>
                <TextInput
                  style={styles.apiKeyInput}
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="sk-..."
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!apiKeyVisible}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity onPress={() => setApiKeyVisible(v => !v)} style={styles.eyeBtn} accessibilityRole="button" accessibilityLabel={apiKeyVisible ? "Masquer la clé" : "Afficher la clé"} hitSlop={tapSlop}>
                  <Ionicons name={apiKeyVisible ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
              <Button
                title={apiKeySaved ? '✓ Sauvegardé' : 'Sauvegarder la clé'}
                onPress={handleSaveApiKey}
                style={{ marginHorizontal: Sp.md, marginBottom: Sp.sm }}
              />
              <View style={styles.apiKeyNote}>
                <Ionicons name="lock-closed-outline" size={12} color={Colors.green} />
                <Text style={styles.apiKeyNoteText}>Ta clé API reste sur ton téléphone uniquement — jamais transmise à nos serveurs.</Text>
              </View>
            </>
          )}
        </View>

        {/* ── LANGUE ───────────────────────────────────────────────────── */}
        <SectionHeader title="LANGUE" />
        <View style={styles.card}>
          <View style={styles.langRow}>
            <TouchableOpacity accessibilityRole="button" style={[styles.langBtn, styles.langBtnActive]}>
              <Text style={styles.langEmoji}>🇫🇷</Text>
              <Text style={styles.langLabel}>Français</Text>
              <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity accessibilityRole="button" style={styles.langBtn} disabled>
              <Text style={styles.langEmoji}>🇬🇧</Text>
              <Text style={[styles.langLabel, { color: Colors.textMuted }]}>English</Text>
              <Text style={styles.langSoon}>Bientôt</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── DONNÉES & CONFIDENTIALITÉ ─────────────────────────────────── */}
        <SectionHeader title="DONNÉES & CONFIDENTIALITÉ" />
        <View style={styles.card}>
          <RowToggle
            icon="lock-closed-outline"
            label={`Verrouiller avec ${bioLabel}`}
            sublabel={lockAvailable
              ? "Demande une authentification à l'ouverture"
              : 'Configure Face ID ou un code sur ton iPhone'}
            value={lockEnabled}
            onToggle={handleToggleLock}
          />
          <View style={styles.encryptedNote}>
            <Ionicons name="shield-checkmark" size={13} color={Colors.green} />
            <Text style={styles.encryptedNoteText}>
              Tes séances, repas et notes sont chiffrés sur cet appareil (AES-256). La clé
              reste dans le Keychain et n'est jamais incluse dans les sauvegardes iCloud.
            </Text>
          </View>
          <RowLink
            icon="download-outline"
            label="Exporter mes données"
            sublabel="Fichier chiffré (.fittrack) — à garder dans iCloud Drive"
            onPress={handleExport}
          />
          <View style={styles.divider} />
          <RowLink
            icon="cloud-download-outline"
            label="Restaurer une sauvegarde"
            sublabel="Depuis un fichier .fittrack exporté"
            onPress={handleImport}
          />
          <View style={styles.divider} />
          <RowLink
            icon="shield-checkmark-outline"
            label="Politique de confidentialité"
            onPress={() => router.push('/modals/privacy-policy')}
          />
          <View style={styles.divider} />
          <RowLink
            icon="document-text-outline"
            label="Conditions d'utilisation"
            onPress={() => router.push('/modals/terms')}
          />
          <View style={styles.divider} />
          <RowLink
            icon="trash-outline"
            label="Supprimer toutes mes données"
            onPress={() => Alert.alert(
              '⚠️ Supprimer toutes mes données',
              'Cette action est irréversible. Toutes tes séances, repas, poids et préférences seront supprimés définitivement.',
              [
                { text: 'Annuler', style: 'cancel' },
                { text: 'Supprimer', style: 'destructive', onPress: () => store.deleteAllData() },
              ],
            )}
            danger
          />
        </View>

        {/* ── DÉVELOPPEUR (__DEV__ uniquement) ─────────────────────────── */}
        {__DEV__ && (
          <>
            <SectionHeader title="DÉVELOPPEUR" />
            <View style={styles.card}>
              <TouchableOpacity accessibilityRole="button"
                style={styles.devBtn}
                onPress={() => Alert.alert(
                  '🛠 Réinitialiser l\'onboarding',
                  'Supprime le profil et l\'état du tutoriel pour retester le flux complet.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Réinitialiser', onPress: async () => { await store.resetOnboarding(); router.replace('/modals/onboarding'); } },
                  ],
                )}
              >
                <Ionicons name="refresh-outline" size={15} color={Colors.orange} />
                <Text style={styles.devBtnText}>Réinitialiser l'onboarding</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity accessibilityRole="button"
                style={styles.devBtn}
                onPress={() => Alert.alert(
                  '🛠 Vider toutes les données',
                  'Supprime toutes les données (séances, repas, poids, etc.) sans réinitialiser le profil.',
                  [
                    { text: 'Annuler', style: 'cancel' },
                    { text: 'Vider', style: 'destructive', onPress: () => store.deleteAllData() },
                  ],
                )}
              >
                <Ionicons name="nuclear-outline" size={15} color={Colors.orange} />
                <Text style={styles.devBtnText}>Vider toutes les données</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* ── INTÉGRATIONS ─────────────────────────────────────────────── */}
        <SectionHeader title="INTÉGRATIONS" />
        <View style={styles.card}>
          <RowToggle
            icon="heart-outline"
            label="Apple Santé"
            sublabel={Platform.OS === 'ios' ? "Synchroniser poids, calories et séances" : "iOS uniquement"}
            value={healthSync}
            onToggle={async (v) => {
              if (Platform.OS !== 'ios') {
                Alert.alert('Non disponible', 'La synchronisation Apple Santé est uniquement disponible sur iOS.');
                return;
              }
              if (!v) {
                setHealthSync(false);
                await disableHealthSync();
                return;
              }
              if (!isHealthAvailable()) {
                Alert.alert('Apple Santé', "Non disponible dans Expo Go — la synchronisation fonctionnera dans l'app installée (build natif).");
                return;
              }
              const ok = await enableHealthSync();
              setHealthSync(ok);
              if (ok) {
                Alert.alert('✅ Apple Santé activé', 'Tes prochaines séances et pesées seront écrites dans Santé.');
              } else {
                Alert.alert('Autorisation refusée', 'Tu peux la modifier dans Réglages iOS → Santé → Accès aux données.');
              }
            }}
          />
          {Platform.OS === 'ios' && healthSync && (
            <View style={{ paddingHorizontal: Sp.md, paddingBottom: Sp.sm }}>
              <Text style={{ fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 17 }}>
                Données écrites dans Santé : séances d'entraînement (durée, calories) et poids.
              </Text>
            </View>
          )}
        </View>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <View style={styles.footer}>
          <Text style={styles.footerTitle}>FitTrack IA v1.0</Text>
          <Text style={styles.footerSub}>Fait avec ❤️ par Maxence</Text>
          <Text style={styles.footerLegal}>
            Données nutritionnelles : Table Ciqual 2020 © ANSES (licence Etalab){'\n'}
            et Open Food Facts (licence ODbL) — openfoodfacts.org
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: Colors.bg },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', gap: Sp.sm, padding: Sp.md, paddingTop: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn:     { padding: 4 },
  headerTitle: { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },

  // Contenu
  content: { padding: Sp.md, paddingBottom: 60, gap: 2 },

  // Sections
  sectionHeader: { fontSize: Fs.xs, fontFamily: Fonts.bold, color: Colors.textMuted, letterSpacing: 0.8, paddingHorizontal: 4, paddingTop: Sp.md, paddingBottom: Sp.xs },

  // Carte
  card: { backgroundColor: Colors.surface, borderRadius: R, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', marginBottom: 2 },

  // Ligne générique
  row:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Sp.md, paddingVertical: 13, gap: Sp.sm },
  rowIcon:       { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  rowIconDanger: { backgroundColor: Colors.red + '18' },
  rowContent:    { flex: 1 },
  rowLabel:      { fontSize: Fs.sm, color: Colors.text, fontFamily: Fonts.medium },
  rowSublabel:   { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, marginTop: 1 },
  divider:       { height: 1, backgroundColor: Colors.border, marginLeft: Sp.md + 30 + Sp.sm },

  // Profil
  profileRow:      { flexDirection: 'row', alignItems: 'center', gap: Sp.md, padding: Sp.md },
  profileAvatar:   { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary + '25', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.primary + '50' },
  profileInitiale: { fontSize: Fs.xl, fontFamily: Fonts.heavy, color: Colors.primary },
  profileInfo:     { flex: 1, gap: 3 },
  profileName:     { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.text },
  profileStats:    { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary },
  goalBadge:       { alignSelf: 'flex-start', backgroundColor: Colors.primary + '18', borderRadius: 99, paddingHorizontal: 8, paddingVertical: 3, marginTop: 2 },
  goalBadgeText:   { fontSize: Fs.xs, color: Colors.primary, fontFamily: Fonts.semibold },
  editProfileBtn:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: Sp.md, marginBottom: Sp.md, paddingVertical: 10, borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '0A' },
  editProfileBtnText: { fontSize: Fs.sm, color: Colors.primary, fontFamily: Fonts.medium },

  // Objectifs
  calRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  calLabel:    { fontSize: Fs.sm, color: Colors.textSecondary, fontFamily: Fonts.medium },
  calInputRow: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.sm, borderWidth: 1, borderColor: Colors.border },
  calInput:    { fontSize: Fs.lg, fontFamily: Fonts.bold, color: Colors.green, paddingVertical: 7, minWidth: 70, textAlign: 'center' },
  calUnit:     { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  macrosRow:   { flexDirection: 'row', gap: Sp.xs, padding: Sp.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  macroInputWrap: { flex: 1, alignItems: 'center', gap: 4 },
  macroInputLabel: { fontSize: Fs.xs, fontFamily: Fonts.medium },
  macroInputRow: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: Colors.surfaceElevated, borderRadius: R, paddingHorizontal: Sp.xs, borderWidth: 1, width: '100%' },
  macroInput:  { flex: 1, fontSize: Fs.md, fontFamily: Fonts.bold, paddingVertical: 7, textAlign: 'center' },
  macroUnit:   { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  fieldLabel:  { fontSize: Fs.xs, color: Colors.textSecondary, fontFamily: Fonts.medium, paddingHorizontal: Sp.md, paddingTop: Sp.sm, paddingBottom: 6 },
  actScroll:         { marginBottom: 2 },
  actScrollContent:  { paddingHorizontal: Sp.md, paddingBottom: Sp.sm, gap: Sp.xs },
  actChip:           { alignItems: 'center', gap: 3, paddingHorizontal: Sp.sm, paddingVertical: 7, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated, minWidth: 62 },
  actChipActive:     { borderColor: Colors.primary, backgroundColor: Colors.primary + '18' },
  actChipEmoji:      { fontSize: 18, fontFamily: Fonts.regular },
  actChipText:       { fontSize: Fs.xs, color: Colors.textSecondary, fontFamily: Fonts.medium },
  actChipTextActive: { color: Colors.primary },
  objBtnsRow:     { flexDirection: 'row', gap: Sp.sm, padding: Sp.md },
  recalcBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRadius: R, borderWidth: 1, borderColor: Colors.primary + '40', backgroundColor: Colors.primary + '0A' },
  recalcBtnText:  { fontSize: Fs.xs, color: Colors.primary, fontFamily: Fonts.medium },

  // Coach IA
  demoBanner:     { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.orange + '18', borderRadius: R, margin: Sp.md, marginBottom: 0, padding: Sp.sm },
  demoBannerText: { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.orange, lineHeight: 17 },
  encryptedNote: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginHorizontal: Sp.md, marginBottom: Sp.sm },
  encryptedNoteText: { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 16 },
  premiumCard: { flexDirection: 'row', alignItems: 'center', gap: Sp.md, backgroundColor: Colors.primary, borderRadius: R, padding: Sp.md, marginHorizontal: Sp.md, marginBottom: Sp.md },
  premiumCardTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.onPrimary },
  premiumCardSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.onPrimary, opacity: 0.85, marginTop: 1 },
  premiumActive: { flexDirection: 'row', alignItems: 'center', gap: Sp.md, backgroundColor: Colors.primary + '14', borderWidth: 1, borderColor: Colors.borderStrong, borderRadius: R, padding: Sp.md, marginHorizontal: Sp.md, marginBottom: Sp.md },
  premiumActiveTitle: { fontSize: Fs.md, fontFamily: Fonts.bold, color: Colors.primary },
  premiumActiveSub: { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textSecondary, marginTop: 1 },
  advancedToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: Sp.md, marginBottom: Sp.sm, paddingVertical: 10, paddingHorizontal: Sp.sm, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  advancedToggleText: { flex: 1, fontSize: Fs.sm, fontFamily: Fonts.medium, color: Colors.textSecondary },
  apiKeyRow:      { flexDirection: 'row', alignItems: 'center', marginHorizontal: Sp.md, marginBottom: Sp.sm, backgroundColor: Colors.surfaceElevated, borderRadius: R, borderWidth: 1, borderColor: Colors.border },
  apiKeyInput:    { flex: 1, fontSize: Fs.sm, fontFamily: Fonts.regular, color: Colors.text, paddingHorizontal: Sp.sm, paddingVertical: 11 },
  eyeBtn:         { padding: Sp.sm },
  apiKeyNote:     { flexDirection: 'row', alignItems: 'flex-start', gap: 6, margin: Sp.md, marginTop: 0 },
  apiKeyNoteText: { flex: 1, fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, lineHeight: 17 },

  // Langue
  langRow:      { flexDirection: 'row', gap: Sp.sm, padding: Sp.md },
  langBtn:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 11, paddingHorizontal: Sp.sm, borderRadius: R, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceElevated },
  langBtnActive: { borderColor: Colors.primary, backgroundColor: Colors.primary + '12' },
  langEmoji:    { fontSize: 18, fontFamily: Fonts.regular },
  langLabel:    { flex: 1, fontSize: Fs.sm, color: Colors.text, fontFamily: Fonts.medium },
  langSoon:     { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted, backgroundColor: Colors.surfaceHighlight, borderRadius: 99, paddingHorizontal: 6, paddingVertical: 2 },

  // Dev
  devBtn:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: Sp.md, paddingVertical: 13 },
  devBtnText: { fontSize: Fs.sm, color: Colors.orange, fontFamily: Fonts.medium },

  // Footer
  footer:     { alignItems: 'center', paddingTop: Sp.xl, paddingBottom: Sp.md, gap: 4 },
  footerTitle: { fontSize: Fs.sm, color: Colors.textSecondary, fontFamily: Fonts.semibold },
  footerSub:  { fontSize: Fs.xs, fontFamily: Fonts.regular, color: Colors.textMuted },
  footerLegal: { fontSize: 10, fontFamily: Fonts.regular, color: Colors.textMuted, textAlign: 'center', marginTop: Sp.sm, lineHeight: 14, opacity: 0.8 },
});
