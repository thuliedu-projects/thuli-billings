import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, StyleSheet, Text, View } from 'react-native';

import { PressableScale, useToast } from '@/components/motion';
import {
  SettingsCard,
  SettingsField,
  SettingsSaveButton,
  SettingsScreen,
} from '@/features/settings';
import { useDemo } from '@/features/demo';
import { theme } from '@/lib/theme';

export default function StoreSettingsScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { stores, updateStore, removeStore, setActiveStore, activeStoreId } = useDemo();

  const store = useMemo(() => stores.find((s) => s.id === id), [stores, id]);

  const [name, setName] = useState(store?.name ?? '');
  const [location, setLocation] = useState(store?.location ?? '');
  const [phone, setPhone] = useState(store?.phone ?? '');
  const [gstin, setGstin] = useState(store?.gstin ?? '');
  const [address, setAddress] = useState(store?.address ?? '');
  const [logoUri, setLogoUri] = useState(store?.logoUri ?? '');

  useEffect(() => {
    if (!store) return;
    setName(store.name);
    setLocation(store.location);
    setPhone(store.phone);
    setGstin(store.gstin);
    setAddress(store.address);
    setLogoUri(store.logoUri);
    navigation.setOptions({ title: store.name || 'Store settings' });
  }, [store, navigation]);

  async function pickLogo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast({ message: 'Photo access is needed for a store logo', tone: 'error' });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setLogoUri(result.assets[0].uri);
    }
  }

  if (!store) {
    return (
      <SettingsScreen>
        <SettingsCard title="Store">
          <Text style={styles.missing}>This store was removed.</Text>
          <PressableScale onPress={() => router.back()} style={styles.backLink}>
            <Text style={styles.backLinkLabel}>Go back</Text>
          </PressableScale>
        </SettingsCard>
      </SettingsScreen>
    );
  }

  const initial = name.trim().slice(0, 1).toUpperCase() || 'S';

  return (
    <SettingsScreen
      footer={
        <>
          <SettingsSaveButton
            label="Save store details"
            onPress={() => {
              updateStore(store.id, { name, location, phone, address, gstin, logoUri });
              setActiveStore(store.id);
            }}
          />
          {stores.length > 1 ? (
            <PressableScale
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert(
                  `Remove ${store.name}?`,
                  'This store and its products, stock, and bills will be removed from the database.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: () => {
                        void (async () => {
                          try {
                            const ok = await removeStore(store.id);
                            if (!ok) {
                              showToast({ message: 'Keep at least one store', tone: 'error' });
                              return;
                            }
                            showToast({ message: 'Store removed', tone: 'success' });
                            router.back();
                          } catch (err) {
                            const message =
                              err instanceof Error && err.message
                                ? err.message
                                : 'Could not delete this store';
                            showToast({ message, tone: 'error' });
                          }
                        })();
                      },
                    },
                  ],
                );
              }}
              scaleTo={0.98}
            >
              <Text style={styles.deleteLabel}>Remove this store</Text>
            </PressableScale>
          ) : null}
          {store.id !== activeStoreId ? (
            <PressableScale
              style={styles.switchBtn}
              onPress={() => {
                setActiveStore(store.id);
                showToast({ message: `Switched to ${store.name}`, tone: 'success' });
              }}
              scaleTo={0.98}
            >
              <Text style={styles.switchLabel}>Make this the active store</Text>
            </PressableScale>
          ) : (
            <Text style={styles.activeHint}>This is your active store</Text>
          )}
        </>
      }
    >
      <SettingsCard title="Store logo">
        <View style={styles.logoRow}>
          <PressableScale onPress={pickLogo} scaleTo={0.96} style={styles.logoTap}>
            {logoUri ? (
              <Image source={{ uri: logoUri }} style={styles.logoImage} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoInitial}>{initial}</Text>
              </View>
            )}
            <View style={styles.logoBadge}>
              <Ionicons name="camera" size={12} color={theme.white} />
            </View>
          </PressableScale>
          <View style={styles.logoActions}>
            <PressableScale onPress={pickLogo} scaleTo={0.98} style={styles.logoBtn}>
              <Text style={styles.logoBtnLabel}>{logoUri ? 'Change logo' : 'Upload logo'}</Text>
            </PressableScale>
            {logoUri ? (
              <PressableScale
                onPress={() => setLogoUri('')}
                scaleTo={0.98}
                style={styles.removeLogoBtn}
              >
                <Text style={styles.removeLogoLabel}>Remove</Text>
              </PressableScale>
            ) : (
              <Text style={styles.logoHint}>Square image works best</Text>
            )}
          </View>
        </View>
      </SettingsCard>

      <SettingsCard title="Store details">
        <SettingsField
          label="Store name"
          value={name}
          onChangeText={setName}
          placeholder="Your store name"
        />
        <SettingsField
          label="Location"
          value={location}
          onChangeText={setLocation}
          placeholder="City, State"
        />
        <SettingsField
          label="Store phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 ..."
          keyboardType="phone-pad"
        />
        <SettingsField
          label="Address"
          value={address}
          onChangeText={setAddress}
          placeholder="Street, area, pincode"
        />
        <SettingsField
          label="GSTIN (optional)"
          value={gstin}
          onChangeText={setGstin}
          placeholder="22AAAAA0000A1Z5"
        />
      </SettingsCard>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  logoTap: {
    position: 'relative',
  },
  logoImage: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: theme.purpleSoft,
  },
  logoPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 18,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.purpleBorder,
  },
  logoInitial: {
    color: theme.purple,
    fontSize: 28,
    fontWeight: '700',
  },
  logoBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.white,
  },
  logoActions: {
    flex: 1,
    gap: 6,
  },
  logoBtn: {
    alignSelf: 'flex-start',
    backgroundColor: theme.purpleSoft,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  logoBtnLabel: {
    color: theme.purple,
    fontSize: 13,
    fontWeight: '700',
  },
  removeLogoBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  removeLogoLabel: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  logoHint: {
    color: theme.textSecondary,
    fontSize: 12,
  },
  missing: {
    color: theme.textSecondary,
    fontSize: 14,
  },
  backLink: {
    marginTop: 12,
  },
  backLinkLabel: {
    color: theme.purple,
    fontWeight: '700',
  },
  deleteBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteLabel: {
    color: theme.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  switchBtn: {
    marginTop: 4,
    alignItems: 'center',
    paddingVertical: 10,
  },
  switchLabel: {
    color: theme.purple,
    fontSize: 13,
    fontWeight: '700',
  },
  activeHint: {
    marginTop: 8,
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 12,
  },
});
