import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { theme } from '@/lib/theme';
import { useReducedMotion } from '@/lib/motion';

import { PressableScale } from './PressableScale';

type EmptyStateProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  ctaIcon?: keyof typeof Ionicons.glyphMap;
  children?: ReactNode;
};

/** Polished empty state with short staggered entrance. */
export function EmptyState({
  icon,
  title,
  body,
  ctaLabel,
  onCta,
  ctaIcon = 'add',
  children,
}: EmptyStateProps) {
  const reduced = useReducedMotion();
  const enter = (delay: number) =>
    reduced ? FadeIn.duration(0) : FadeInDown.delay(delay).duration(260).springify().damping(17);

  return (
    <View style={styles.wrap}>
      <Animated.View entering={enter(0)} style={styles.art}>
        <Ionicons name={icon} size={48} color={theme.purple} />
      </Animated.View>
      <Animated.View entering={enter(70)}>
        <Text style={styles.title}>{title}</Text>
      </Animated.View>
      <Animated.View entering={enter(120)}>
        <Text style={styles.body}>{body}</Text>
      </Animated.View>
      {ctaLabel && onCta ? (
        <Animated.View entering={enter(170)}>
          <PressableScale style={styles.cta} onPress={onCta} hapticOnPress="medium" scaleTo={0.96}>
            <Ionicons name={ctaIcon} size={18} color={theme.white} />
            <Text style={styles.ctaLabel}>{ctaLabel}</Text>
          </PressableScale>
        </Animated.View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  art: {
    width: 112,
    height: 112,
    borderRadius: 24,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    color: theme.purpleDark,
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: 6,
    marginBottom: 18,
    color: theme.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.purple,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  ctaLabel: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '700',
  },
});
