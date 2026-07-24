import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Demande d'avis in-app au bon moment ──────────────────────────────────────
//
// Levier n°1 du classement App Store : plus d'avis → mieux classé → plus
// d'installs. On ne déclenche la fenêtre native (StoreReview) QUE sur un moment
// positif (séance enregistrée, record battu) et UNE SEULE FOIS, jamais de façon
// intrusive. Apple limite lui-même l'affichage à ~3× par an — inutile de
// harceler, on demande une fois et on note qu'on l'a fait.

const ASKED_KEY = '@fit_review_asked';
const COUNT_KEY = '@fit_positive_events';

// Nombre de moments positifs avant de solliciter (laisse l'utilisateur
// s'attacher à l'app d'abord).
const THRESHOLD = 3;

/**
 * À appeler après un moment positif (fin de séance, nouveau PR…).
 * Incrémente un compteur ; au 3e, propose l'avis natif une seule fois.
 */
export async function registerPositiveEvent(): Promise<void> {
  try {
    const already = await AsyncStorage.getItem(ASKED_KEY);
    if (already === 'true') return;

    const count = parseInt((await AsyncStorage.getItem(COUNT_KEY)) ?? '0', 10) + 1;
    await AsyncStorage.setItem(COUNT_KEY, String(count));
    if (count < THRESHOLD) return;

    if (await StoreReview.hasAction()) {
      await StoreReview.requestReview();
      await AsyncStorage.setItem(ASKED_KEY, 'true');
    }
  } catch {
    /* jamais bloquant */
  }
}
