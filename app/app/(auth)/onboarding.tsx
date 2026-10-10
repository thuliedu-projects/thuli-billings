import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackground, PrimaryButton, ThuliLogo } from '@/features/auth';
import { theme } from '@/lib/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const PAGE_W = SCREEN_W;

const SLIDES = [
  {
    key: 'billing',
    eyebrow: 'Billing',
    title: 'Lightning Fast Billing',
    body: 'Create professional bills in just 2–3 taps. Built for busy counters.',
    icon: 'flash' as const,
    hero: 'billing' as const,
  },
  {
    key: 'inventory',
    eyebrow: 'Inventory',
    title: 'Smart Inventory',
    body: 'Track stock, get low-stock alerts, and manage products effortlessly.',
    icon: 'cube-outline' as const,
    hero: 'inventory' as const,
  },
  {
    key: 'insights',
    eyebrow: 'Analytics',
    title: 'Business Insights',
    body: 'Track sales, spot trends, and make better decisions for your store.',
    icon: 'bar-chart-outline' as const,
    hero: 'insights' as const,
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [index, setIndex] = useState(0);
  const progress = useSharedValue(0);

  function goSetup() {
    router.push('/setup-business');
  }

  function goLogin() {
    router.replace('/');
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const x = e.nativeEvent.contentOffset.x;
    progress.value = x / PAGE_W;
    const next = Math.round(x / PAGE_W);
    if (next !== index && next >= 0 && next < SLIDES.length) setIndex(next);
  }

  function goNext() {
    if (index >= SLIDES.length - 1) {
      goSetup();
      return;
    }
    scrollRef.current?.scrollTo({ x: (index + 1) * PAGE_W, animated: true });
  }

  return (
    <AuthBackground>
      <StatusBar style="dark" />
      <View style={[styles.root, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.topBar}>
          <View style={styles.topSpacer} />
          <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={goSetup} hitSlop={12}>
            <Text style={styles.skip}>Skip</Text>
          </Pressable>
        </View>

        <ThuliLogo size="sm" />

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          style={styles.pager}
        >
          {SLIDES.map((item) => (
            <View key={item.key} style={[styles.page, { width: PAGE_W }]}>
              <SlideHero kind={item.hero} />
              <View style={styles.copyCard}>
                <View style={styles.eyebrowRow}>
                  <View style={styles.featureIcon}>
                    <Ionicons name={item.icon} size={18} color={theme.purple} />
                  </View>
                  <Text style={styles.eyebrow}>{item.eyebrow}</Text>
                </View>
                <Text style={styles.headline}>
                  {item.title.split(' ').slice(0, -1).join(' ')}{' '}
                  <Text style={styles.headlineAccent}>{item.title.split(' ').slice(-1)}</Text>
                </Text>
                <Text style={styles.body}>{item.body}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          <View style={styles.dots}>
            {SLIDES.map((item, i) => (
              <Dot key={item.key} index={i} progress={progress} />
            ))}
          </View>

          <PrimaryButton
            label={index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
            onPress={goNext}
            showArrow={index < SLIDES.length - 1}
            style={styles.cta}
          />

          <View style={styles.loginRow}>
            <Text style={styles.loginMuted}>Already have an account? </Text>
            <Pressable accessibilityRole="button" onPress={goLogin} hitSlop={8}>
              <Text style={styles.loginLink}>Login</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </AuthBackground>
  );
}

function Dot({ index, progress }: { index: number; progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const active = interpolate(
      progress.value,
      [index - 1, index, index + 1],
      [0, 1, 0],
      Extrapolation.CLAMP,
    );
    return {
      width: 7 + active * 12,
      opacity: 0.35 + active * 0.65,
      backgroundColor: theme.purple,
    };
  });
  return <Animated.View style={[styles.dot, style]} />;
}

function SlideHero({ kind }: { kind: 'billing' | 'inventory' | 'insights' }) {
  const scale = useSharedValue(0.94);

  useEffect(() => {
    scale.value = withSpring(1, { damping: 14, stiffness: 160 });
  }, [kind, scale]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  return (
    <Animated.View style={[styles.hero, anim]}>
      {kind === 'billing' ? <BillingHeroArt /> : null}
      {kind === 'inventory' ? <InventoryHeroArt /> : null}
      {kind === 'insights' ? <InsightsHeroArt /> : null}
    </Animated.View>
  );
}

function BillingHeroArt() {
  return (
    <View style={styles.heroInner}>
      <View style={styles.phone}>
        <View style={styles.phoneNotch} />
        <Text style={styles.phoneLabel}>New Bill</Text>
        <Text style={styles.phoneAmount}>₹1,240</Text>
        <View style={styles.billLines}>
          <View style={styles.billLine} />
          <View style={[styles.billLine, { width: '70%' }]} />
          <View style={[styles.billLine, { width: '85%' }]} />
        </View>
        <View style={styles.payPill}>
          <Text style={styles.payPillText}>Pay</Text>
        </View>
      </View>
      <View style={styles.sideCard}>
        <Ionicons name="receipt-outline" size={22} color={theme.purple} />
        <Text style={styles.sideCardText}>2 taps</Text>
      </View>
    </View>
  );
}

function InventoryHeroArt() {
  return (
    <View style={styles.heroInner}>
      <View style={styles.invCard}>
        <View style={styles.invRow}>
          <View style={styles.invThumb}>
            <Ionicons name="cube" size={18} color={theme.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.invName}>Surf Excel 1kg</Text>
            <Text style={styles.invMeta}>Household</Text>
          </View>
          <Text style={styles.invLow}>Low</Text>
        </View>
        <View style={styles.invRow}>
          <View style={styles.invThumb}>
            <Ionicons name="cube-outline" size={18} color={theme.purple} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.invName}>Amul Milk 1L</Text>
            <Text style={styles.invMeta}>Dairy · 40 in stock</Text>
          </View>
          <Text style={styles.invOk}>OK</Text>
        </View>
      </View>
    </View>
  );
}

function InsightsHeroArt() {
  return (
    <View style={styles.heroInner}>
      <View style={styles.chartCard}>
        <Text style={styles.phoneLabel}>This week</Text>
        <Text style={styles.phoneAmountDark}>₹12,450</Text>
        <View style={styles.bars}>
          {[0.4, 0.65, 0.5, 0.9, 0.7, 0.55, 0.8].map((h, i) => (
            <View key={i} style={[styles.bar, { height: 54 * h }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
  topSpacer: {
    flex: 1,
  },
  skip: {
    color: theme.purple,
    fontSize: 14,
    fontWeight: '700',
  },
  pager: {
    flex: 1,
    marginTop: 4,
  },
  page: {
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  hero: {
    width: '100%',
    height: 240,
    marginTop: 8,
    marginBottom: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroInner: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phone: {
    width: 128,
    height: 176,
    borderRadius: 18,
    backgroundColor: theme.purpleDark,
    paddingTop: 12,
    paddingHorizontal: 14,
  },
  phoneNotch: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3A2F4D',
    marginBottom: 12,
  },
  phoneLabel: {
    color: theme.purpleMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  phoneAmount: {
    marginTop: 4,
    color: theme.white,
    fontSize: 20,
    fontWeight: '800',
  },
  phoneAmountDark: {
    marginTop: 4,
    color: theme.purpleDark,
    fontSize: 22,
    fontWeight: '800',
  },
  billLines: {
    marginTop: 14,
    gap: 8,
  },
  billLine: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3A2F4D',
    width: '100%',
  },
  payPill: {
    marginTop: 'auto',
    marginBottom: 14,
    backgroundColor: theme.purple,
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  payPillText: {
    color: theme.white,
    fontWeight: '800',
    fontSize: 12,
  },
  sideCard: {
    position: 'absolute',
    right: 28,
    bottom: 28,
    backgroundColor: theme.white,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: 'center',
    gap: 4,
  },
  sideCardText: {
    color: theme.purpleDark,
    fontSize: 11,
    fontWeight: '700',
  },
  invCard: {
    width: '88%',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 14,
    gap: 12,
    backgroundColor: theme.white,
  },
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  invThumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  invName: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  invMeta: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  invLow: {
    color: theme.warning,
    fontWeight: '800',
    fontSize: 12,
  },
  invOk: {
    color: theme.success,
    fontWeight: '800',
    fontSize: 12,
  },
  chartCard: {
    width: '88%',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 16,
    backgroundColor: theme.white,
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginTop: 18,
    height: 54,
  },
  bar: {
    flex: 1,
    borderRadius: 4,
    backgroundColor: theme.purple,
  },
  copyCard: {
    width: '100%',
    alignItems: 'flex-start',
    backgroundColor: theme.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 18,
    shadowColor: theme.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    color: theme.purple,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  headline: {
    color: theme.purpleDark,
    fontSize: 26,
    fontWeight: '800',
    lineHeight: 34,
  },
  headlineAccent: {
    color: theme.purple,
  },
  body: {
    marginTop: 10,
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 21,
  },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 8,
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  cta: {
    width: '100%',
  },
  loginRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginMuted: {
    color: theme.textSecondary,
    fontSize: 13,
  },
  loginLink: {
    color: theme.purple,
    fontSize: 13,
    fontWeight: '700',
  },
});
