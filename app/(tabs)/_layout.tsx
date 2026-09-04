// Powered by OnSpace.AI
import { MaterialIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Platform, View } from 'react-native';
import { UpdateBanner } from '@/components';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const bannerBottom = Platform.select({ ios: insets.bottom + 68, android: insets.bottom + 68, default: 78 });

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            height: Platform.select({ ios: insets.bottom + 60, android: insets.bottom + 60, default: 70 }),
            paddingTop: 8,
            paddingBottom: Platform.select({
              ios: insets.bottom + 8,
              android: insets.bottom + 8,
              default: 8,
            }),
            paddingHorizontal: 16,
            backgroundColor: Colors.surface,
            borderTopWidth: 1,
            borderTopColor: Colors.border,
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: Colors.textMuted,
          tabBarLabelStyle: { fontSize: 12, fontWeight: '500' },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Groupes',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="folder" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="all-photos"
          options={{
            title: 'Photos',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="photo-library" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="carnet"
          options={{
            title: 'Carnets',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="menu-book" size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profil',
            tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />,
          }}
        />
      </Tabs>
      {/* Floats just above the tab bar so it is visible from any tab. */}
      <View
        style={{ position: 'absolute', left: 0, right: 0, bottom: bannerBottom }}
        pointerEvents="box-none"
      >
        <UpdateBanner />
      </View>
    </View>
  );
}
