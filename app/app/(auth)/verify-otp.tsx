import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  OtpInput,
  PrimaryButton,
  ThuliLogo,
  loadAccess,
  paymentRequiredRoute,
  toIndiaPhone,
} from '@/features/auth';
import { ShakeView, useToast } from '@/components/motion';
import { supabase } from '@/lib/supabase';
import { theme } from '@/lib/theme';

const RESEND_SECONDS = 60;

function formatMobile(raw: string) {
  const digits = raw.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) {
    return raw ? `+91 ${raw}` : '+91';
  }
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export default function VerifyOtpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ phone?: string; mobile?: string }>();
  const phoneParam = typeof params.phone === 'string' ? params.phone : '';
  const mobileParam = typeof params.mobile === 'string' ? params.mobile : '';
  const phone = toIndiaPhone(phoneParam || mobileParam) ?? '';
  const didNavigate = useRef(false);
  const verifying = useRef(false);
  const submittedCode = useRef('');

  const [otp, setOtp] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [otpError, setOtpError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(0);
  const { showToast } = useToast();

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const verify = useCallback(async () => {
    if (otp.length < 6) {
      setOtpError(true);
      setShake((n) => n + 1);
      showToast({ message: 'Enter the 6-digit OTP', tone: 'error' });
      return;
    }
    if (verifying.current || didNavigate.current) return;
    if (!supabase || !phone) {
      showToast({ message: 'Sign-in is not configured', tone: 'error' });
      return;
    }
    verifying.current = true;
    setBusy(true);
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: otp,
      type: 'sms',
    });
    verifying.current = false;
    if (error) {
      setBusy(false);
      setOtpError(true);
      setShake((n) => n + 1);
      showToast({ message: error.message, tone: 'error' });
      return;
    }
    didNavigate.current = true;
    const access = await loadAccess();
    setBusy(false);
    showToast({ message: 'Phone verified', tone: 'success' });
    if (access.state === 'paid') {
      router.replace('/onboarding');
      return;
    }
    router.replace(paymentRequiredRoute);
  }, [otp, phone, router, showToast]);

  useEffect(() => {
    if (otp.length !== 6 || submittedCode.current === otp) return;
    submittedCode.current = otp;
    setOtpError(false);
    void verify();
  }, [otp, verify]);

  const timerLabel = `00:${String(secondsLeft).padStart(2, '0')}`;

  async function onResend() {
    if (secondsLeft > 0 || busy) return;
    if (!supabase || !phone) {
      showToast({ message: 'Sign-in is not configured', tone: 'error' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ phone });
    setBusy(false);
    if (error) {
      showToast({ message: error.message, tone: 'error' });
      return;
    }
    setSecondsLeft(RESEND_SECONDS);
    setOtp('');
    setOtpError(false);
    submittedCode.current = '';
    didNavigate.current = false;
    showToast({ message: 'Code sent on WhatsApp', tone: 'info' });
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
              <Ionicons name="arrow-back" size={22} color={theme.purple} />
            </Pressable>
          </View>

          <ThuliLogo size="sm" />

          <View style={styles.heroIcon}>
            <View style={styles.shieldCircle}>
              <Ionicons name="shield" size={44} color={theme.purple} />
              <View style={styles.lockOverlay}>
                <Ionicons name="lock-closed" size={16} color={theme.white} />
              </View>
            </View>
            <View style={styles.checkBadge}>
              <Ionicons name="checkmark" size={14} color={theme.white} />
            </View>
          </View>

          <Text style={styles.title}>Verify Your Phone</Text>
          <Text style={styles.subtitle}>Enter the 6-digit code sent on WhatsApp to</Text>
          <View style={styles.phoneRow}>
            <Text style={styles.phone}>{formatMobile(phone)}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Edit phone number"
              onPress={() => router.back()}
              hitSlop={8}
            >
              <Text style={styles.editLink}>Edit</Text>
            </Pressable>
          </View>

          <View style={styles.otpBlock}>
            <ShakeView trigger={shake}>
              <OtpInput
                value={otp}
                onChange={(code) => {
                  setOtp(code);
                  if (otpError) setOtpError(false);
                }}
                error={otpError}
              />
            </ShakeView>
          </View>

          <View style={styles.resendRow}>
            <Text style={styles.resendMuted}>Didn't receive the code? </Text>
            {secondsLeft > 0 ? (
              <Text style={styles.resendActive}>Resend in {timerLabel}</Text>
            ) : (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void onResend();
                }}
                hitSlop={8}
              >
                <Text style={styles.resendActive}>Resend</Text>
              </Pressable>
            )}
          </View>

          <PrimaryButton
            label="Verify OTP"
            onPress={() => {
              void verify();
            }}
            loading={busy}
            style={styles.verifyBtn}
          />
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
    paddingHorizontal: 24,
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
  heroIcon: {
    marginTop: 16,
    marginBottom: 12,
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shieldCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.purple,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: theme.white,
  },
  title: {
    color: theme.purpleDark,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  phoneRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  phone: {
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '700',
  },
  editLink: {
    color: theme.purple,
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  otpBlock: {
    width: '100%',
    marginTop: 18,
    paddingHorizontal: 4,
  },
  resendRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resendMuted: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  resendActive: {
    color: theme.purple,
    fontSize: 13,
    fontWeight: '700',
  },
  verifyBtn: {
    width: '100%',
    marginTop: 16,
  },
});
