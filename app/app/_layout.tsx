import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { ToastProvider } from '@/components/motion';
import { SubscriptionGate } from '@/features/auth';
import { useColorScheme } from '@/components/useColorScheme';
import { DemoProvider } from '@/features/demo';
import { applyAppFonts, fontAssets } from '@/lib/fonts';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(auth)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...fontAssets,
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      applyAppFonts();
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <DemoProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ToastProvider>
          <SubscriptionGate />
          <Stack
            screenOptions={{
              animation: 'fade_from_bottom',
              animationDuration: 280,
            }}
          >
            <Stack.Screen name="(auth)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'fade' }} />
            <Stack.Screen name="(pos)" options={{ headerShown: false }} />
            <Stack.Screen name="(inventory)" options={{ headerShown: false }} />
            <Stack.Screen
              name="(analytics)"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="(settings)"
              options={{ headerShown: false, animation: 'slide_from_right' }}
            />
          </Stack>
        </ToastProvider>
      </ThemeProvider>
    </DemoProvider>
  );
}
