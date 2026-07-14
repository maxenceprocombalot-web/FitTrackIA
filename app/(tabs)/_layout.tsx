import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Fs, Fonts } from '../../constants/theme';
import { useAppStore } from '../../store/useAppStore';
import TutorialOverlay from '../../components/ui/TutorialOverlay';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, focused: boolean, size = 20) {
  return (
    <Ionicons
      name={focused ? (name.replace('-outline', '') as IconName) : name}
      size={size}
      color={focused ? Colors.primary : Colors.textMuted}
    />
  );
}

export default function TabsLayout() {
  const store = useAppStore();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarStyle: {
            backgroundColor: Colors.surface,
            borderTopColor: Colors.border,
            borderTopWidth: 1,
            height: 90,
            paddingBottom: 28,
            paddingTop: 8,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: { fontSize: 9, fontFamily: Fonts.medium },
          headerStyle: { backgroundColor: Colors.bg },
          headerTintColor: Colors.text,
          headerTitleStyle: { fontFamily: Fonts.bold, fontSize: Fs.lg },
          headerShadowVisible: false,
        }}
      >
        {/* ── 5 onglets visibles ─────────────────────────────────────────────── */}
        <Tabs.Screen
          name="index"
          listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
          options={{ title: "Aujourd'hui", tabBarIcon: ({ focused }) => icon('home-outline', focused) }}
        />
        <Tabs.Screen
          name="workout"
          listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
          options={{ title: 'Sport', tabBarIcon: ({ focused }) => icon('barbell-outline', focused) }}
        />
        <Tabs.Screen
          name="nutrition"
          listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
          options={{ title: 'Nutrition', tabBarIcon: ({ focused }) => icon('nutrition-outline', focused) }}
        />
        <Tabs.Screen
          name="coach"
          listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
          options={{ title: 'Coach IA', tabBarIcon: ({ focused }) => icon('chatbubble-ellipses-outline', focused) }}
        />
        <Tabs.Screen
          name="progress"
          listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) }}
          options={{ title: 'Progrès', tabBarIcon: ({ focused }) => icon('trending-up-outline', focused) }}
        />

        {/* Programmes : retiré du layout de la tab bar pour ne pas créer d'espace vide ── */}
        <Tabs.Screen
          name="programs"
          options={{
            title: 'Programmes',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tabs>

      {!store.tutorialDone && !!store.user?.onboardingDone && (
        <TutorialOverlay onDone={() => store.markTutorialDone()} />
      )}
    </View>
  );
}
