import { Stack } from 'expo-router';

import { theme } from '@/lib/theme';

export default function SettingsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.background },
        headerTintColor: theme.purple,
        headerTitleStyle: {
          fontFamily: theme.font.bold,
          color: theme.purpleDark,
          fontSize: 17,
        },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.backgroundMuted },
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Settings' }} />
      <Stack.Screen name="account" options={{ title: 'Account settings' }} />
      <Stack.Screen name="stores" options={{ title: 'Your stores' }} />
      <Stack.Screen name="store/index" options={{ title: 'Store settings' }} />
      <Stack.Screen name="store/[id]" options={{ title: 'Store settings' }} />
      <Stack.Screen name="notifications" options={{ title: 'Notifications' }} />
      <Stack.Screen name="billing-preferences" options={{ title: 'Billing preferences' }} />
      <Stack.Screen name="help" options={{ title: 'Help & support' }} />
      <Stack.Screen name="about" options={{ title: 'About THULI' }} />
    </Stack>
  );
}
