import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthBackground, PrimaryButton } from '@/features/auth';
import { useDemo } from '@/features/demo';
import { theme } from '@/lib/theme';

const BURST = [
  { angle: -70, dist: 54, delay: 80, size: 18 },
  { angle: -25, dist: 62, delay: 120, size: 16 },
  { angle: 20, dist: 58, delay: 100, size: 20 },
  { angle: 65, dist: 52, delay: 140, size: 17 },
  { angle: 110, dist: 48, delay: 160, size: 15 },
  { angle: 155, dist: 56, delay: 110, size: 18 },
  { angle: -115, dist: 50, delay: 150, size: 16 },
  { angle: -160, dist: 46, delay: 130, size: 14 },
];

export default function StoreCreatedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { storeName, storeLocation, storePhone } = useDemo();

  const hero = useSharedValue(0);
  const flash = useSharedValue(0);

  useEffect(() => {
    hero.value = withSpring(1, { damping: 12, stiffness: 150 });
    flash.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: 420, easing: Easing.inOut(Easing.quad) }),
    );
  }, [flash, hero]);

  const checkStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: interpolate(hero.value, [0, 0.7, 1], [0.2, 1.18, 1]) },
      { rotate: `${interpolate(hero.value, [0, 1], [-18, 0])}deg` },
    ],
    opacity: interpolate(hero.value, [0, 0.2, 1], [0, 1, 1]),
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(hero.value, [0, 1], [0.4, 1.55]) }],
    opacity: interpolate(hero.value, [0, 0.4, 1], [0.55, 0.28, 0]),
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flash.value * 0.35,
  }));

  return (
    <AuthBackground>
      <StatusBar style="dark" />
      <View style={[styles.root, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
        <Animated.View pointerEvents="none" style={[styles.flash, flashStyle]} />

        <View style={styles.hero}>
          <Animated.View style={[styles.ring, ringStyle]} />
          {BURST.map((piece, index) => (
            <BurstCheck key={index} {...piece} progress={hero} />
          ))}
          <Animated.View style={[styles.checkCircle, checkStyle]}>
            <Ionicons name="checkmark" size={42} color={theme.white} />
          </Animated.View>
        </View>

        <Animated.View entering={FadeInDown.delay(220).springify().damping(16)}>
          <Text style={styles.title}>Store Created Successfully!</Text>
          <Text style={styles.subtitle}>Your store is all set and ready to go.</Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(380).springify().damping(16)}
          style={styles.card}
        >
          <View style={styles.storeIcon}>
            <Ionicons name="storefront" size={22} color={theme.purple} />
          </View>
          <Text style={styles.yourStore}>YOUR STORE</Text>
          <Text style={styles.storeName}>{storeName}</Text>
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="location" size={14} color={theme.purple} />
              <Text style={styles.metaText}>{storeLocation}</Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons name="call" size={14} color={theme.purple} />
              <Text style={styles.metaText}>{storePhone}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(520).springify().damping(16)}
          style={styles.nextRow}
        >
          <View style={styles.bulb}>
            <Ionicons name="bulb" size={18} color={theme.purple} />
          </View>
          <View style={styles.nextCopy}>
            <Text style={styles.nextTitle}>What's Next?</Text>
            <Text style={styles.nextBody}>
              Add products, to start creating bills and managing your inventory.
            </Text>
          </View>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(660).springify().damping(16)}
          style={styles.actions}
        >
          <PrimaryButton
            label="Add Products"
            showArrow
            onPress={() => router.replace('/(tabs)/products')}
          />
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryPressed]}
            onPress={() => router.replace('/(tabs)/dashboard')}
          >
            <Ionicons name="grid-outline" size={18} color={theme.purple} />
            <Text style={styles.secondaryLabel}>Go to Dashboard</Text>
          </Pressable>
        </Animated.View>
      </View>
    </AuthBackground>
  );
}

function BurstCheck({
  angle,
  dist,
  delay,
  size,
  progress,
}: {
  angle: number;
  dist: number;
  delay: number;
  size: number;
  progress: SharedValue<number>;
}) {
  const local = useSharedValue(0);

  useEffect(() => {
    local.value = withDelay(
      delay,
      withSpring(1, { damping: 11, stiffness: 180 }),
    );
  }, [delay, local]);

  const style = useAnimatedStyle(() => {
    const rad = (angle * Math.PI) / 180;
    const t = local.value * Math.min(1, progress.value + 0.15);
    const d = dist * t;
    return {
      opacity: interpolate(t, [0, 0.25, 0.75, 1], [0, 1, 0.85, 0]),
      transform: [
        { translateX: Math.cos(rad) * d },
        { translateY: Math.sin(rad) * d },
        { scale: interpolate(t, [0, 0.4, 1], [0.3, 1.15, 0.7]) },
        { rotate: `${angle + t * 20}deg` },
      ],
    };
  });

  return (
    <Animated.View style={[styles.burst, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Ionicons name="checkmark" size={size * 0.55} color={theme.white} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  flash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: theme.purple,
  },
  hero: {
    width: '100%',
    height: 150,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  ring: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: theme.purple,
  },
  burst: {
    position: 'absolute',
    backgroundColor: theme.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: theme.purpleDark,
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    color: theme.textSecondary,
    fontSize: 14,
    textAlign: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: theme.card,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  storeIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  yourStore: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  storeName: {
    marginTop: 6,
    color: theme.purpleDark,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
  },
  metaRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  metaDivider: {
    width: 1,
    height: 28,
    backgroundColor: theme.border,
  },
  metaText: {
    color: theme.textSecondary,
    fontSize: 11,
    flexShrink: 1,
  },
  nextRow: {
    width: '100%',
    marginTop: 22,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bulb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextCopy: {
    flex: 1,
  },
  nextTitle: {
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '700',
  },
  nextBody: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    width: '100%',
    marginTop: 'auto',
    paddingTop: 24,
    gap: 12,
  },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.purple,
    backgroundColor: theme.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryPressed: {
    backgroundColor: theme.purpleSoft,
  },
  secondaryLabel: {
    color: theme.purple,
    fontSize: 16,
    fontWeight: '700',
  },
});
