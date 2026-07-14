import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold,
  Barlow_700Bold, Barlow_800ExtraBold,
} from '@expo-google-fonts/barlow';
import {
  BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold,
} from '@expo-google-fonts/barlow-condensed';
import { Colors, Fonts } from '../constants/theme';
import { requestNotificationPermissions, scheduleAllReminders } from '../services/notifications';
import { loadApiKey, loadNotifPrefs } from '../services/storage';
import { setRuntimeApiKey } from '../services/openai';

// Garde le splash affiché tant que les polices ne sont pas prêtes
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useFonts({
    Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold,
    Barlow_700Bold, Barlow_800ExtraBold,
    BarlowCondensed_600SemiBold, BarlowCondensed_700Bold, BarlowCondensed_800ExtraBold,
  });

  useEffect(() => {
    // fontsError : on démarre quand même (polices système en secours)
    if (fontsLoaded || fontsError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontsError]);

  useEffect(() => {
    (async () => {
      // Charger la clé API stockée (paramètres utilisateur)
      const key = await loadApiKey();
      if (key) setRuntimeApiKey(key);

      // Planifier les rappels selon les préférences sauvegardées
      const granted = await requestNotificationPermissions();
      if (granted) {
        const prefs = await loadNotifPrefs();
        scheduleAllReminders(prefs);
      }
    })();
  }, []);

  if (!fontsLoaded && !fontsError) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontFamily: Fonts.bold, color: Colors.text },
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
          name="modals/settings"
          options={{ headerShown: false, presentation: 'modal' }}
        />
        <Stack.Screen
          name="modals/workout-detail"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="modals/privacy-policy"
          options={{ title: 'Politique de confidentialité', presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="modals/terms"
          options={{ title: "Conditions d'utilisation", presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen
          name="modals/nutrition-detail"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="modals/exercise-history"
          options={{ headerShown: false, presentation: 'card' }}
        />
        <Stack.Screen
          name="modals/plate-calculator"
          options={{ headerShown: false, presentation: 'modal' }}
        />
      </Stack>
    </>
  );
}
