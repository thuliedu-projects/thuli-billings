import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FadeInView, PressableScale, useToast } from '@/components/motion';
import { useDemo } from '@/features/demo';
import { theme } from '@/lib/theme';

function actionErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return 'Could not complete that action';
}

type MoreLink = {
  label: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href?: string;
  onPress?: () => void;
};

const SECTIONS: { title: string; items: MoreLink[] }[] = [
  {
    title: 'Stores',
    items: [
      {
        label: 'Your stores',
        subtitle: 'Switch, add, or edit stores',
        icon: 'storefront-outline',
        href: '/(settings)/stores',
      },
    ],
  },
  {
    title: 'Account',
    items: [
      {
        label: 'Account settings',
        subtitle: 'Phone, profile & security',
        icon: 'person-circle-outline',
        href: '/(settings)/account',
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        label: 'Notifications',
        subtitle: 'Alerts for low stock & bills',
        icon: 'notifications-outline',
        href: '/(settings)/notifications',
      },
      {
        label: 'Billing preferences',
        subtitle: 'Defaults for new bills',
        icon: 'receipt-outline',
        href: '/(settings)/billing-preferences',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        label: 'Help & support',
        subtitle: 'FAQs and contact',
        icon: 'help-circle-outline',
        href: '/(settings)/help',
      },
      {
        label: 'About THULI',
        subtitle: 'Version and legal',
        icon: 'information-circle-outline',
        href: '/(settings)/about',
      },
    ],
  },
];

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    stores,
    activeStore,
    removeStore,
    deleteAccount,
  } = useDemo();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  function confirmDeleteStore() {
    if (busy) return;
    if (stores.length <= 1) {
      showToast({
        message: 'Keep at least one store, or delete the account instead',
        tone: 'error',
      });
      return;
    }
    Alert.alert(
      `Delete ${activeStore.name}?`,
      'This store and its products, stock, and bills will be removed from the database.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete store',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              try {
                const ok = await removeStore(activeStore.id);
                if (!ok) {
                  showToast({
                    message: 'Keep at least one store, or delete the account instead',
                    tone: 'error',
                  });
                  return;
                }
                showToast({ message: 'Store deleted', tone: 'success' });
              } catch (err) {
                showToast({ message: actionErrorMessage(err), tone: 'error' });
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  }

  function confirmDeleteAccount() {
    if (busy) return;
    Alert.alert(
      'Delete account?',
      'This removes your organization, every store, and this login from the database. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Permanently delete account?',
              'All stores, products, bills, and the owner login will be erased.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete account',
                  style: 'destructive',
                  onPress: () => {
                    void (async () => {
                      setBusy(true);
                      try {
                        await deleteAccount();
                        showToast({ message: 'Account deleted', tone: 'success' });
                        router.replace('/(auth)');
                      } catch (err) {
                        showToast({ message: actionErrorMessage(err), tone: 'error' });
                      } finally {
                        setBusy(false);
                      }
                    })();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 28 }}
        showsVerticalScrollIndicator={false}
      >
        <FadeInView>
          <Text style={styles.title}>More</Text>
          <Text style={styles.subtitle}>{activeStore.name}</Text>
        </FadeInView>

        <Animated.View
          entering={FadeInDown.delay(40).duration(240).springify().damping(18)}
          style={styles.profileCard}
        >
          <View style={styles.avatar}>
            {activeStore.logoUri ? (
              <Image source={{ uri: activeStore.logoUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>{activeStore.name.slice(0, 1).toUpperCase()}</Text>
            )}
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.profileName}>{activeStore.name}</Text>
            <Text style={styles.profileMeta}>
              {activeStore.location || 'No location set'}
            </Text>
          </View>
          <PressableScale
            onPress={() => router.push(`/(settings)/store/${activeStore.id}` as never)}
            scaleTo={0.94}
            style={styles.editChip}
          >
            <Text style={styles.editChipLabel}>Edit</Text>
          </PressableScale>
        </Animated.View>

        {SECTIONS.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, index) => (
                <Animated.View
                  key={item.label}
                  entering={FadeInDown.delay(80 + sectionIndex * 60 + index * 40)
                    .duration(240)
                    .springify()
                    .damping(18)}
                >
                  <PressableScale
                    style={[styles.row, index > 0 && styles.rowBorder]}
                    onPress={() => {
                      if (item.href) router.push(item.href as never);
                      else item.onPress?.();
                    }}
                    scaleTo={0.985}
                  >
                    <View style={styles.icon}>
                      <Ionicons name={item.icon} size={18} color={theme.purple} />
                    </View>
                    <View style={styles.rowCopy}>
                      <Text style={styles.label}>{item.label}</Text>
                      <Text style={styles.rowSubtitle}>{item.subtitle}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                  </PressableScale>
                </Animated.View>
              ))}
            </View>
          </View>
        ))}

        <Animated.View
          entering={FadeInDown.delay(320).duration(240).springify().damping(18)}
          style={styles.section}
        >
          <Text style={[styles.sectionTitle, styles.sectionTitleSpaced]}>Danger zone</Text>
          <View style={styles.card}>
            <PressableScale
              style={styles.row}
              disabled={busy}
              onPress={confirmDeleteStore}
              scaleTo={0.985}
            >
              <View style={[styles.icon, styles.dangerIcon]}>
                <Ionicons name="storefront-outline" size={18} color={theme.danger} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.label, styles.dangerLabel]}>Delete store</Text>
                <Text style={styles.rowSubtitle}>
                  Remove {activeStore.name} and its data from the database
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </PressableScale>
            <PressableScale
              style={[styles.row, styles.rowBorder]}
              disabled={busy}
              onPress={confirmDeleteAccount}
              scaleTo={0.985}
            >
              <View style={[styles.icon, styles.dangerIcon]}>
                <Ionicons name="trash-outline" size={18} color={theme.danger} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.label, styles.dangerLabel]}>Delete account</Text>
                <Text style={styles.rowSubtitle}>Erase this business and login</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(360).duration(240).springify().damping(18)}
          style={styles.section}
        >
          <View style={styles.card}>
            <PressableScale
              style={styles.row}
              disabled={busy}
              onPress={() => {
                showToast({ message: 'Signed out', tone: 'info' });
                router.replace('/(auth)');
              }}
              scaleTo={0.985}
            >
              <View style={[styles.icon, styles.dangerIcon]}>
                <Ionicons name="log-out-outline" size={18} color={theme.danger} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={[styles.label, styles.dangerLabel]}>Sign out</Text>
                <Text style={styles.rowSubtitle}>Return to login</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </PressableScale>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.backgroundMuted,
    paddingHorizontal: 20,
  },
  title: {
    color: theme.purpleDark,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 16,
    color: theme.textSecondary,
    fontSize: 13,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    marginBottom: 20,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 48,
    height: 48,
  },
  avatarText: {
    color: theme.purple,
    fontSize: 20,
    fontWeight: '800',
  },
  profileCopy: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '700',
  },
  profileMeta: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 12,
  },
  editChip: {
    backgroundColor: theme.purpleSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  editChipLabel: {
    color: theme.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionTitleSpaced: {
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: theme.white,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dangerIcon: {
    backgroundColor: theme.dangerSoft,
  },
  rowCopy: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '600',
  },
  dangerLabel: {
    color: theme.danger,
  },
  rowSubtitle: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 12,
  },
});
