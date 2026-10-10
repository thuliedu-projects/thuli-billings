import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AuthBackground,
  AuthField,
  PrimaryButton,
  ThuliLogo,
} from '@/features/auth';
import { useDemo } from '@/features/demo';
import { theme } from '@/lib/theme';

type FocusKey = 'name' | 'mobile' | 'gst' | 'address' | null;

export default function SetupBusinessScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setStoreDetails } = useDemo();

  const [businessName, setBusinessName] = useState('');
  const [mobile, setMobile] = useState('');
  const [gst, setGst] = useState('');
  const [address, setAddress] = useState('');
  const [focused, setFocused] = useState<FocusKey>(null);

  const canCreate = businessName.trim().length > 0;

  function onCreateStore() {
    setStoreDetails({
      name: businessName.trim() || undefined,
      phone: mobile.trim()
        ? `+91 ${mobile.replace(/\D/g, '').slice(-10)}`
        : undefined,
      location: address.trim() || undefined,
      address: address.trim() || undefined,
      gstin: gst.trim() || undefined,
    });
    router.push('/(auth)/store-created');
  }

  return (
    <AuthBackground>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={theme.purpleDark} />
            </Pressable>
          </View>

          <ThuliLogo size="sm" />

          <Text style={styles.title}>Setup Your Business</Text>
          <Text style={styles.subtitle}>Let's get your business details to get you started.</Text>

          <View style={styles.card}>
            <AuthField
              label="Business Name"
              required
              icon="business-outline"
              placeholder="Enter your business name"
              value={businessName}
              onChangeText={setBusinessName}
              focused={focused === 'name'}
              onFocusChange={(isFocused) => setFocused(isFocused ? 'name' : null)}
              helperText="This will be shown on your bills and invoices."
              autoCapitalize="words"
            />

            <AuthField
              label="Mobile Number"
              optional
              icon="call-outline"
              placeholder="Enter mobile number"
              value={mobile}
              onChangeText={setMobile}
              keyboardType="phone-pad"
              focused={focused === 'mobile'}
              onFocusChange={(isFocused) => setFocused(isFocused ? 'mobile' : null)}
            />

            <AuthField
              label="GST Number"
              optional
              icon="id-card-outline"
              placeholder="Enter GST number"
              value={gst}
              onChangeText={setGst}
              autoCapitalize="characters"
              focused={focused === 'gst'}
              onFocusChange={(isFocused) => setFocused(isFocused ? 'gst' : null)}
            />

            <AuthField
              label="Address"
              optional
              icon="location-outline"
              placeholder="Enter business address"
              value={address}
              onChangeText={setAddress}
              focused={focused === 'address'}
              onFocusChange={(isFocused) => setFocused(isFocused ? 'address' : null)}
            />

            <Text style={styles.uploadLabel}>Logo (Optional)</Text>
            <Pressable
              style={({ pressed }) => [styles.uploadBox, pressed && styles.uploadPressed]}
              onPress={() => {
                // Image picker wires up after models / media stage.
              }}
            >
              <Ionicons name="image-outline" size={28} color={theme.purple} />
              <Text style={styles.uploadTitle}>Upload Logo</Text>
              <Text style={styles.uploadHint}>JPG, PNG up to 2MB</Text>
            </Pressable>

            <PrimaryButton
              label="Create Store"
              showArrow
              disabled={!canCreate}
              onPress={onCreateStore}
              style={styles.createBtn}
            />
          </View>

          <View style={styles.secureRow}>
            <Ionicons name="lock-closed" size={12} color={theme.purple} />
            <Text style={styles.secureText}>
              Your data is secure and only used to improve your experience.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  topBar: {
    width: '100%',
    marginBottom: 4,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    marginTop: 16,
    color: theme.purpleDark,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  card: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 18,
    padding: 18,
    shadowColor: theme.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  uploadLabel: {
    marginBottom: 8,
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: theme.purpleBorder,
    backgroundColor: theme.purpleSoft,
    borderRadius: 12,
    paddingVertical: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  uploadPressed: {
    opacity: 0.85,
  },
  uploadTitle: {
    marginTop: 8,
    color: theme.purple,
    fontSize: 14,
    fontWeight: '700',
  },
  uploadHint: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 11,
  },
  createBtn: {
    marginTop: 10,
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  secureText: {
    flex: 1,
    color: theme.textSecondary,
    fontSize: 11,
    lineHeight: 15,
  },
});
