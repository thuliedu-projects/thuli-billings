import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="payment-required" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="setup-business" />
      <Stack.Screen name="store-created" />
    </Stack>
  );
}
