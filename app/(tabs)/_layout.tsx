import { Tabs, useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fs, Fw } from '../../constants/theme';

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

// Bouton "Programmes 📋" affiché dans le header de l'onglet Sport
function ProgramsHeaderBtn() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={{ marginRight: 16, flexDirection: 'row', alignItems: 'center', gap: 5 }}
      onPress={() => router.push('/(tabs)/programs')}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons name="list-outline" size={16} color={Colors.primary} />
      <Text style={{ fontSize: Fs.sm, fontWeight: Fw.semibold, color: Colors.primary }}>
        Programmes
      </Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  return (
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
        tabBarLabelStyle: { fontSize: 9, fontWeight: '500' },
        headerStyle: { backgroundColor: Colors.bg },
        headerTintColor: Colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: Fs.lg },
        headerShadowVisible: false,
      }}
    >
      {/* ── 5 onglets visibles ─────────────────────────────────────────────── */}
      <Tabs.Screen
        name="index"
        options={{ title: "Aujourd'hui", tabBarIcon: ({ focused }) => icon('home-outline', focused) }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Sport',
          tabBarIcon: ({ focused }) => icon('barbell-outline', focused),
          headerRight: () => <ProgramsHeaderBtn />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Nutrition', tabBarIcon: ({ focused }) => icon('nutrition-outline', focused) }}
      />
      <Tabs.Screen
        name="coach"
        options={{ title: 'Coach IA', tabBarIcon: ({ focused }) => icon('chatbubble-ellipses-outline', focused) }}
      />
      <Tabs.Screen
        name="progress"
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
  );
}
