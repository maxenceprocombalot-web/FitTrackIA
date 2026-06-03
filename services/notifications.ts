import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

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

export async function scheduleAllReminders(): Promise<void> {
  // N'annule que les rappels récurrents (daily/weekly), pas les notifs ponctuelles
  // (streak cassé, bilan mensuel, PRs) qui ont leur propre identifiant
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const recurringIds = scheduled
    .filter(n => {
      const trigger = n.trigger as any;
      return trigger?.type === 'daily' || trigger?.type === 'weekly';
    })
    .map(n => n.identifier);
  await Promise.all(recurringIds.map(id => Notifications.cancelScheduledNotificationAsync(id)));

  // Rappel déjeuner — 12h
  await Notifications.scheduleNotificationAsync({
    content: { title: '🍽️ Déjeuner tracké ?', body: "N'oublie pas d'enregistrer ton repas de midi !" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 12, minute: 0 },
  });

  // Rappel dîner — 19h
  await Notifications.scheduleNotificationAsync({
    content: { title: '🌙 Dîner tracké ?', body: "L'heure du dîner approche — pense à le noter." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 0 },
  });

  // Rappel séance — vendredi 17h
  await Notifications.scheduleNotificationAsync({
    content: { title: '💪 Objectif hebdo', body: "Cette semaine, t'es-tu suffisamment entraîné ?" },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 6, hour: 17, minute: 0 },
  });

  // Bilan semaine — dimanche 20h
  await Notifications.scheduleNotificationAsync({
    content: { title: '📊 Bilan de la semaine', body: "Ouvre FitTrackIA pour voir ton bilan sport et nutrition." },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: 1, hour: 20, minute: 0 },
  });

  // Rappels hydratation toutes les 2h de 8h à 22h
  for (let h = 8; h <= 22; h += 2) {
    await Notifications.scheduleNotificationAsync({
      content: { title: '💧 Hydratation', body: "Pense à t'hydrater ! Bois un verre d'eau." },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: h, minute: 0 },
    });
  }

  // Bilan mensuel — 1er du mois à 9h (via calendrier)
  const now  = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 9, 0, 0);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📊 Ton bilan de ${now.toLocaleString('fr-FR', { month: 'long' })} est prêt !`,
      body: 'Ouvre FitTrackIA pour voir tes statistiques du mois.',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: next },
  });
}

// ─── Notification streak cassé ────────────────────────────────────────────────

export async function scheduleStreakBrokenNotification(): Promise<void> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Tu n'as pas fait de séance hier 😔",
      body: 'Reprends aujourd\'hui et relance ton streak 💪',
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: tomorrow },
  });
}
