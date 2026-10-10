import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, useToast } from '@/components/motion';
import { useDemo } from '@/features/demo';
import { SettingsScreen } from '@/features/settings';
import { theme } from '@/lib/theme';

function actionErrorMessage(err: unknown) {
  if (err instanceof Error && err.message) return err.message;
  return 'Could not complete that action';
}

export default function StoresScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { stores, activeStoreId, setActiveStore, addStore, removeStore } = useDemo();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  function confirmDeleteStore(storeId: string, storeName: string) {
    if (busy) return;
    if (stores.length <= 1) {
      showToast({
        message: 'Keep at least one store, or delete the account instead',
        tone: 'error',
      });
      return;
    }
    Alert.alert(
      `Delete ${storeName}?`,
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
                const ok = await removeStore(storeId);
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

  return (
    <SettingsScreen>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{stores.length} store{stores.length === 1 ? '' : 's'}</Text>
          <Text style={styles.hint}>Tap a store to make it active. Use settings to edit details.</Text>
        </View>
        <PressableScale
          onPress={() => {
            const id = addStore({
              name: `Store ${stores.length + 1}`,
              location: '',
              phone: '',
            });
            showToast({ message: 'Store added', tone: 'success' });
            router.push(`/(settings)/store/${id}` as never);
          }}
          scaleTo={0.95}
          style={styles.addChip}
        >
          <Ionicons name="add" size={14} color={theme.purple} />
          <Text style={styles.addLabel}>Add store</Text>
        </PressableScale>
      </View>

      <View style={styles.card}>
        {stores.map((store, index) => {
          const active = store.id === activeStoreId;
          return (
            <Animated.View
              key={store.id}
              entering={FadeInDown.delay(40 + index * 40)
                .duration(240)
                .springify()
                .damping(18)}
            >
              <PressableScale
                style={[styles.row, index > 0 && styles.rowBorder]}
                onPress={() => {
                  setActiveStore(store.id);
                  showToast({ message: `${store.name} is active`, tone: 'success' });
                }}
                scaleTo={0.985}
              >
                <View
                  style={[
                    styles.icon,
                    active && !store.logoUri && styles.iconActive,
                    store.logoUri ? styles.iconLogo : null,
                  ]}
                >
                  {store.logoUri ? (
                    <Image source={{ uri: store.logoUri }} style={styles.storeLogo} />
                  ) : (
                    <Ionicons
                      name="storefront-outline"
                      size={18}
                      color={active ? theme.white : theme.purple}
                    />
                  )}
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.label}>{store.name}</Text>
                  <Text style={styles.rowSubtitle}>
                    {store.location || 'No location set'}
                    {active ? ' · Active' : ''}
                  </Text>
                </View>
                <PressableScale
                  onPress={() => router.push(`/(settings)/store/${store.id}` as never)}
                  scaleTo={0.92}
                  style={styles.iconBtn}
                  hitSlop={8}
                >
                  <Ionicons name="settings-outline" size={16} color={theme.purple} />
                </PressableScale>
                {stores.length > 1 ? (
                  <PressableScale
                    onPress={() => confirmDeleteStore(store.id, store.name)}
                    scaleTo={0.92}
                    style={styles.deleteBtn}
                    hitSlop={8}
                    disabled={busy}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.danger} />
                  </PressableScale>
                ) : null}
              </PressableScale>
            </Animated.View>
          );
        })}
      </View>

      <View style={{ height: insets.bottom }} />
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 14,
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '700',
  },
  hint: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  addChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.purpleSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  addLabel: {
    color: theme.purple,
    fontSize: 12,
    fontWeight: '700',
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
    gap: 10,
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
  iconLogo: {
    backgroundColor: theme.border,
  },
  iconActive: {
    backgroundColor: theme.purple,
  },
  storeLogo: {
    width: 36,
    height: 36,
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
  rowSubtitle: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 12,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: theme.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
