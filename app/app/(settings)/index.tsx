import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import { theme } from '@/lib/theme';

const LINKS = [
  { label: 'Account settings', href: '/(settings)/account' },
  { label: 'Your stores', href: '/(settings)/stores' },
  { label: 'Notifications', href: '/(settings)/notifications' },
  { label: 'Billing preferences', href: '/(settings)/billing-preferences' },
];

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Manage your account and store</Text>
      <View style={styles.list}>
        {LINKS.map((item) => (
          <PressableScale
            key={item.href}
            style={styles.row}
            onPress={() => router.push(item.href as never)}
            scaleTo={0.98}
          >
            <Text style={styles.label}>{item.label}</Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: theme.backgroundMuted,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: theme.purpleDark,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    color: theme.textSecondary,
    fontSize: 14,
  },
  list: {
    gap: 10,
  },
  row: {
    backgroundColor: theme.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
  },
  label: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '600',
  },
});
