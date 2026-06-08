import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/theme';
import { requestNotificationPermissions, scheduleAllReminders } from '../services/notifications';

export default function RootLayout() {
  useEffect(() => {
    // Demande les permissions et planifie les rappels au démarrage
    requestNotificationPermissions().then(granted => {
      if (granted) scheduleAllReminders();
    });
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontWeight: '700', color: Colors.text },
          contentStyle: { backgroundColor: Colors.bg },
          headerShadowVisible: false,
          headerBackTitle: 'Retour',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modals/onboarding"
          options={{ headerShown: false, presentation: 'fullScreenModal' }}
        />
        <Stack.Screen
          name="modals/add-workout"
          options={{ title: 'Nouvelle séance', presentation: 'modal' }}
        />
        <Stack.Screen
          name="modals/add-food"
          options={{ title: 'Ajouter un aliment', presentation: 'modal' }}
        />
        <Stack.Screen
          name="programs/[id]"
          options={{ title: 'Programme', presentation: 'card' }}
        />
        <Stack.Screen
          name="modals/plan-detail"
          options={{ title: 'Plan', presentation: 'modal' }}
        />
        <Stack.Screen
          name="modals/ai-program"
          options={{ title: 'Programme IA', presentation: 'modal' }}
        />
        <Stack.Screen
          name="modals/monthly-summary"
          options={{ title: 'Bilan mensuel', presentation: 'fullScreenModal', headerShown: false }}
        />
        <Stack.Screen
          name="modals/privacy-policy"
          options={{ title: 'Politique de confidentialité', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="modals/terms"
          options={{ title: "Conditions d'utilisation", presentation: 'modal', headerShown: false }}
        />
      </Stack>
    </>
  );
}
