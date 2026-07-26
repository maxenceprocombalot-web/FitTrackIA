import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Verrou biométrique de l'app (Face ID / Touch ID) ─────────────────────────
//
// Principe de sûreté : on ne doit JAMAIS pouvoir enfermer l'utilisateur dehors.
// - repli sur le code de l'appareil si la biométrie échoue,
// - si l'appareil n'a aucune biométrie/code configuré, le verrou se désactive
//   de lui-même plutôt que de bloquer l'accès aux données.

const ENABLED_KEY = '@fit_app_lock';

/** Le verrou est-il activé par l'utilisateur ? */
export const isLockEnabled = async (): Promise<boolean> =>
  (await AsyncStorage.getItem(ENABLED_KEY)) === 'true';

export const setLockEnabled = (on: boolean) =>
  on ? AsyncStorage.setItem(ENABLED_KEY, 'true') : AsyncStorage.removeItem(ENABLED_KEY);

/** L'appareil peut-il authentifier (biométrie enrôlée ou code) ? */
export async function canUseLock(): Promise<boolean> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled    = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && enrolled;
  } catch {
    return false;
  }
}

/** Libellé du capteur (pour l'UI) : « Face ID », « Touch ID »… */
export async function biometricLabel(): Promise<string> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) return 'Face ID';
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT))        return 'Touch ID';
    return 'Biométrie';
  } catch {
    return 'Biométrie';
  }
}

/**
 * Demande l'authentification. Renvoie true si l'accès est accordé.
 * Renvoie true aussi si l'appareil ne peut pas authentifier (anti-lockout).
 */
export async function authenticate(): Promise<boolean> {
  try {
    if (!(await canUseLock())) return true;      // pas de biométrie → ne pas bloquer
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Déverrouille FitTrack IA',
      cancelLabel: 'Annuler',
      disableDeviceFallback: false,              // repli code de l'appareil
    });
    return res.success;
  } catch {
    return true;                                 // en cas d'erreur, ne pas enfermer dehors
  }
}
