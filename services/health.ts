import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession, WorkoutType } from '../types';
import { localISO } from './date';

// Apple Santé (HealthKit) via @kingstinct/react-native-healthkit.
// Le module est natif : chargé paresseusement pour que l'app reste
// utilisable dans Expo Go (où il n'existe pas). Toutes les écritures sont
// best-effort — un échec HealthKit ne doit jamais bloquer une sauvegarde.

const PREF_KEY = '@fit_health_sync';

let _hk: any | null | undefined;
function getHK(): any | null {
  if (_hk !== undefined) return _hk;
  if (Platform.OS !== 'ios') { _hk = null; return _hk; }
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    _hk = require('@kingstinct/react-native-healthkit');
    if (!_hk?.isHealthDataAvailable?.()) _hk = null;
  } catch {
    _hk = null;
  }
  return _hk;
}

/** Le module natif est-il présent ET HealthKit disponible sur cet appareil ? */
export function isHealthAvailable(): boolean {
  return getHK() !== null;
}

export async function isHealthSyncEnabled(): Promise<boolean> {
  return (await AsyncStorage.getItem(PREF_KEY)) === '1';
}

/** Active la sync : demande les autorisations, mémorise la préférence. */
export async function enableHealthSync(): Promise<boolean> {
  const hk = getHK();
  if (!hk) return false;
  try {
    // Apple ne révèle jamais si l'écriture est refusée : requestAuthorization
    // réussit dès que la boîte de dialogue a été traitée.
    await hk.requestAuthorization({
      toShare: ['HKQuantityTypeIdentifierBodyMass', 'HKWorkoutTypeIdentifier'],
      toRead:  ['HKQuantityTypeIdentifierBodyMass'],
    });
    await AsyncStorage.setItem(PREF_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export async function disableHealthSync(): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, '0');
}

const ACTIVITY_MAP: Record<WorkoutType, number> = {
  strength: 50, // traditionalStrengthTraining
  cardio:   52, // walking (générique cardio doux)
  hiit:     63, // highIntensityIntervalTraining
  yoga:     57, // yoga
  running:  37, // running
  other:    3000, // other
};

/** Écrit une séance dans Apple Santé. Best-effort, ne lève jamais. */
export async function writeWorkoutToHealth(w: WorkoutSession): Promise<void> {
  try {
    const hk = getHK();
    if (!hk || !(await isHealthSyncEnabled())) return;
    const start = new Date(`${w.date}T12:00:00`);
    const end   = new Date(start.getTime() + Math.max(w.duration, 1) * 60000);
    const totals = w.caloriesBurned > 0 ? { energyBurned: w.caloriesBurned } : undefined;
    await hk.saveWorkoutSample(ACTIVITY_MAP[w.type] ?? 3000, [], start, end, totals);
  } catch {
    // silencieux : la séance est déjà sauvegardée dans l'app
  }
}

/** Écrit une pesée dans Apple Santé. Best-effort, ne lève jamais. */
export async function writeWeightToHealth(kg: number, dateISO: string): Promise<void> {
  try {
    const hk = getHK();
    if (!hk || !(await isHealthSyncEnabled())) return;
    const d = new Date(`${dateISO}T12:00:00`);
    await hk.saveQuantitySample('HKQuantityTypeIdentifierBodyMass', 'kg', kg, d, d);
  } catch {
    // silencieux
  }
}

/**
 * Dernier poids enregistré dans Apple Santé (balance connectée, saisie
 * manuelle…). Retourne null si la sync est coupée ou sans donnée.
 */
export async function readLatestWeightFromHealth(): Promise<{ kg: number; date: string } | null> {
  try {
    const hk = getHK();
    if (!hk || !(await isHealthSyncEnabled())) return null;
    const samples = await hk.queryQuantitySamples('HKQuantityTypeIdentifierBodyMass', {
      limit: 1, ascending: false, unit: 'kg',
    });
    const s = samples?.[0];
    const kg = Number(s?.quantity);
    if (!s || !Number.isFinite(kg) || kg < 20 || kg > 400) return null;
    const d = new Date(s.startDate);
    if (Number.isNaN(d.getTime())) return null;
    return { kg: Math.round(kg * 10) / 10, date: localISO(d) };
  } catch {
    return null;
  }
}
