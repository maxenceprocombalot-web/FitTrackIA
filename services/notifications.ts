import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { NotifPrefs } from '../types';
import { NOTIF_PREFS_DEFAULT } from './storage';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// ─── Permissions ──────────────────────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'FitTrackIA',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// ─── Planification de tous les rappels ────────────────────────────────────────

// Toutes les notifications programmées par l'app portent un marqueur dans
// `data`. C'est lui qui sert à les annuler — et NON le type de déclencheur :
// sur iOS, un trigger DAILY/WEEKLY est relu comme `type: 'calendar'`, si bien
// qu'un filtre sur 'daily'/'weekly' ne correspondait à rien et que chaque
// lancement de l'app empilait un jeu de rappels supplémentaire.
const KIND = 'fitkind';
type Kind = 'reminder' | 'streak';

/** Annule les rappels récurrents, plus les notifications héritées non marquées. */
async function cancelManagedReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ids = scheduled
    .filter(n => {
      const kind = (n.content?.data as any)?.[KIND] as Kind | undefined;
      // Les non marquées viennent d'une version antérieure : on nettoie le stock accumulé.
      return kind === 'reminder' || kind === undefined;
    })
    .map(n => n.identifier);
  await Promise.all(ids.map(id => Notifications.cancelScheduledNotificationAsync(id)));
}

/** Programme une notification marquée comme rappel géré. */
function schedule(
  title: string,
  body: string,
  trigger: Notifications.NotificationTriggerInput,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: { title, body, data: { [KIND]: 'reminder' satisfies Kind } },
    trigger,
  });
}

const daily  = (hour: number) =>
  ({ type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute: 0 }) as const;
const weekly = (weekday: number, hour: number) =>
  ({ type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour, minute: 0 }) as const;

// Heures d'hydratation choisies pour ne JAMAIS tomber en même temps qu'un autre
// rappel (repas 12h/19h, séance 17h, bilan 20h, streak et mensuel 9h) : deux
// notifications à la même minute donnent l'impression d'un bug.
const WATER_HOURS = [10, 14, 16, 21];

export async function scheduleAllReminders(
  prefs: NotifPrefs = NOTIF_PREFS_DEFAULT,
): Promise<void> {
  await cancelManagedReminders();

  if (prefs.meals) {
    await schedule('🍽️ Déjeuner tracké ?', "N'oublie pas d'enregistrer ton repas de midi !", daily(12));
    await schedule('🌙 Dîner tracké ?', "L'heure du dîner approche — pense à le noter.", daily(19));
  }

  if (prefs.workout) {
    await schedule('💪 Objectif hebdo', "Cette semaine, t'es-tu suffisamment entraîné ?", weekly(6, 17));
  }

  if (prefs.weekly) {
    await schedule('📊 Bilan de la semaine', 'Ouvre FitTrackIA pour voir ton bilan sport et nutrition.', weekly(1, 20));
  }

  if (prefs.water) {
    for (const h of WATER_HOURS) {
      await schedule('💧 Hydratation', "Pense à t'hydrater ! Bois un verre d'eau.", daily(h));
    }
  }

  // Bilan mensuel — 1er du mois à 9h
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
  await schedule(
    `📊 Ton bilan de ${now.toLocaleString('fr-FR', { month: 'long' })} est prêt !`,
    'Ouvre FitTrackIA pour voir tes statistiques du mois.',
    { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next },
  );
}

// ─── Notification streak cassé ────────────────────────────────────────────────

export async function scheduleStreakBrokenNotification(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Ton tapis t\'attend 💪',
      body: 'Une séance aujourd\'hui et ton streak repart. Même 20 min comptent.',
      data: { [KIND]: 'streak' satisfies Kind },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrow },
  });
}
