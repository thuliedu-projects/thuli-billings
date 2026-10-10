import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackground, PrimaryButton, ThuliLogo } from '@/features/auth';
import { loadAccess } from '@/features/auth/access';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';

export default function PaymentRequiredScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState(
    'This number is not on a paid plan yet. Pay on the THULI website, then sign in here with the same mobile.',
  );
  const [checking, setChecking] = useState(false);

  async function onCheck() {
    setChecking(true);
    const access = await loadAccess();
    setChecking(false);
    if (access.state === 'paid') {
      router.replace('/onboarding');
      return;
    }
    if (access.state === 'signed_out') {
      router.replace('/(auth)');
      return;
    }
    if (access.state === 'error') {
      setMessage(access.message);
      return;
    }
    setMessage('Still unpaid. Finish payment on the website, then check again.');
  }

  async function onLogout() {
    await supabase?.auth.signOut();
    router.replace('/(auth)');
  }

  return (
    <AuthBackground>
      <StatusBar style="dark" />
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <ThuliLogo size="sm" />
        <View style={styles.icon}>
          <Ionicons name="card-outline" size={36} color={theme.purple} />
        </View>
        <Text style={styles.title}>Payment required</Text>
        <Text style={styles.body}>{message}</Text>
        <PrimaryButton label="I've paid — check again" onPress={() => void onCheck()} loading={checking} />
        <Pressable accessibilityRole="button" onPress={() => void onLogout()} hitSlop={8}>
          <Text style={styles.logout}>Log out</Text>
        </Pressable>
      </View>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  icon: {
    marginTop: 28,
    marginBottom: 12,
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.purpleDark,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: 10,
    marginBottom: 22,
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  logout: {
    marginTop: 16,
    color: theme.purple,
    fontSize: 14,
    fontWeight: '700',
  },
});
