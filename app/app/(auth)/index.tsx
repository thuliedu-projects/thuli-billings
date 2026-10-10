import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AuthBackground,
  MobileNumberField,
  PrimaryButton,
  ThuliLogo,
  loadAccess,
  paymentRequiredRoute,
  toIndiaPhone,
} from '@/features/auth';
import { ShakeView, useToast } from '@/components/motion';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';

const SCREEN_W = Dimensions.get('window').width;
const SCROLL_PAD = 20;
const FEATURE_CARD_W = SCREEN_W - SCROLL_PAD * 2;
const FEATURE_AUTO_MS = 3200;
const FEATURE_RESUME_MS = 5000;

const FEATURES = [
  {
    icon: 'flash-outline' as const,
    title: 'Fast Billing',
    body: 'Create bills in just 2–3 taps',
  },
  {
    icon: 'cube-outline' as const,
    title: 'Easy Inventory',
    body: 'Manage stock effortlessly',
  },
  {
    icon: 'stats-chart-outline' as const,
    title: 'Smart Dashboard',
    body: 'Track your business in real-time',
  },
];

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const [mobile, setMobile] = useState('');
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [shake, setShake] = useState(0);
  const [featureIndex, setFeatureIndex] = useState(0);
  const [checkingSession, setCheckingSession] = useState(true);
  const featureScrollRef = useRef<ScrollView>(null);
  const featureIndexRef = useRef(0);
  const userPausedUntilRef = useRef(0);
  const autoScrollLockRef = useRef(false);

  const scrollToFeature = useCallback((index: number, animated = true) => {
    const next = ((index % FEATURES.length) + FEATURES.length) % FEATURES.length;
    autoScrollLockRef.current = true;
    featureScrollRef.current?.scrollTo({
      x: next * FEATURE_CARD_W,
      animated,
    });
    featureIndexRef.current = next;
    setFeatureIndex(next);
    // Allow onScroll to update again after the animated settle.
    setTimeout(() => {
      autoScrollLockRef.current = false;
    }, animated ? 450 : 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const access = await loadAccess();
      if (cancelled) return;
      if (access.state === 'paid') {
        router.replace('/(tabs)/dashboard');
        return;
      }
      if (access.state === 'unpaid' || access.state === 'error') {
        router.replace(paymentRequiredRoute);
        return;
      }
      setCheckingSession(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    const id = setInterval(() => {
      if (Date.now() < userPausedUntilRef.current) return;
      scrollToFeature(featureIndexRef.current + 1);
    }, FEATURE_AUTO_MS);
    return () => clearInterval(id);
  }, [scrollToFeature]);

  const pauseAutoAdvance = useCallback(() => {
    userPausedUntilRef.current = Date.now() + FEATURE_RESUME_MS;
  }, []);

  const onSendOtp = useCallback(async () => {
    const phone = toIndiaPhone(mobile);
    if (!phone) {
      setError('Enter a valid 10-digit mobile number');
      setShake((n) => n + 1);
      showToast({ message: 'Enter a valid mobile number', tone: 'error' });
      return;
    }
    if (!supabase) {
      showToast({ message: 'Sign-in is not configured', tone: 'error' });
      return;
    }
    setError('');
    setSending(true);
    Keyboard.dismiss();
    const { error: sendError } = await supabase.auth.signInWithOtp({ phone });
    setSending(false);
    if (sendError) {
      setShake((n) => n + 1);
      showToast({ message: sendError.message, tone: 'error' });
      return;
    }
    router.push({
      pathname: '/verify-otp',
      params: { phone },
    });
  }, [mobile, router, showToast]);

  const onFeatureScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (autoScrollLockRef.current) return;
    const next = Math.round(e.nativeEvent.contentOffset.x / FEATURE_CARD_W);
    if (next !== featureIndexRef.current && next >= 0 && next < FEATURES.length) {
      featureIndexRef.current = next;
      setFeatureIndex(next);
    }
  }, []);

  if (checkingSession) {
    return <AuthBackground />;
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
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <ThuliLogo />

          <View style={styles.dividerRow}>
            <View style={styles.goldLine} />
            <View style={styles.goldDot} />
            <View style={styles.goldLine} />
          </View>

          <Text style={styles.welcome}>Welcome Back!</Text>
          <Text style={styles.subtitle}>Login to continue to your account</Text>

          <View style={styles.card}>
            <ShakeView trigger={shake}>
              <MobileNumberField
                value={mobile}
                onChangeText={(text) => {
                  setMobile(text.replace(/\D/g, '').slice(0, 10));
                  if (error) setError('');
                }}
                focused={focused}
                onFocusChange={setFocused}
                errorText={error}
              />
            </ShakeView>

            <PrimaryButton
              label="Send OTP"
              onPress={() => {
                void onSendOtp();
              }}
              loading={sending}
              showArrow
            />
          </View>

          <View style={styles.signupRow}>
            <Text style={styles.signupText}>Don't have an account? </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                Alert.alert(
                  'Sign up on the website',
                  'Create your account on the THULI website with this mobile number and complete payment. Then log in here.',
                );
              }}
            >
              <Text style={styles.signupLink}>Sign Up &gt;</Text>
            </Pressable>
          </View>

          <View style={styles.whyHeader}>
            <View style={styles.whyLine} />
            <Text style={styles.whyTitle}>Why businesses love THULI Billings</Text>
            <View style={styles.whyLine} />
          </View>

          <ScrollView
            ref={featureScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={onFeatureScroll}
            onScrollBeginDrag={pauseAutoAdvance}
            scrollEventThrottle={16}
            decelerationRate="fast"
            style={styles.featureCarousel}
            contentContainerStyle={styles.featureCarouselContent}
          >
            {FEATURES.map((item) => (
              <View key={item.title} style={[styles.feature, { width: FEATURE_CARD_W }]}>
                <View style={styles.featureIcon}>
                  <Ionicons name={item.icon} size={20} color={theme.purple} />
                </View>
                <View style={styles.featureCopy}>
                  <Text style={styles.featureTitle}>{item.title}</Text>
                  <Text style={styles.featureBody}>{item.body}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          <View style={styles.featureDots}>
            {FEATURES.map((item, i) => (
              <Pressable
                key={item.title}
                accessibilityRole="button"
                accessibilityLabel={`Show ${item.title}`}
                hitSlop={8}
                onPress={() => {
                  pauseAutoAdvance();
                  scrollToFeature(i);
                }}
                style={[styles.featureDot, i === featureIndex && styles.featureDotActive]}
              />
            ))}
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
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 18,
    gap: 8,
  },
  goldLine: {
    width: 36,
    height: 1,
    backgroundColor: theme.gold,
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: theme.gold,
  },
  welcome: {
    color: theme.purpleDark,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
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
  signupRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signupText: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  signupLink: {
    color: theme.purple,
    fontSize: 13,
    fontWeight: '700',
  },
  whyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 28,
    marginBottom: 16,
    gap: 8,
    width: '100%',
  },
  whyLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: theme.border,
  },
  whyTitle: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 200,
  },
  featureCarousel: {
    width: FEATURE_CARD_W,
    flexGrow: 0,
  },
  featureCarouselContent: {
    alignItems: 'stretch',
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: theme.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureCopy: {
    flex: 1,
    minWidth: 0,
  },
  featureTitle: {
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  featureBody: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  featureDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  featureDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.border,
  },
  featureDotActive: {
    width: 18,
    backgroundColor: theme.purple,
  },
});
