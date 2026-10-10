import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';

import { motion, useReducedMotion } from '@/lib/motion';

type Direction = 'none' | 'up' | 'down';

type FadeInViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  delay?: number;
  duration?: number;
  direction?: Direction;
};

/** Lightweight entrance — skip travel when Reduce Motion is on. */
export function FadeInView({
  children,
  style,
  delay = 0,
  duration = motion.standard,
  direction = 'down',
}: FadeInViewProps) {
  const reduced = useReducedMotion();

  const entering = (() => {
    if (reduced) return FadeIn.duration(0);
    if (direction === 'up') return FadeInUp.delay(delay).duration(duration);
    if (direction === 'down') return FadeInDown.delay(delay).duration(duration);
    return FadeIn.delay(delay).duration(duration);
  })();

  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}

/** Staggered list row entrance — capped so large lists stay cheap. */
export function ListItemEnter({
  index,
  children,
  style,
  maxStagger = 8,
}: {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  maxStagger?: number;
}) {
  const reduced = useReducedMotion();
  const delay = Math.min(index, maxStagger) * 35;

  return (
    <Animated.View
      entering={
        reduced
          ? FadeIn.duration(0)
          : FadeInDown.delay(delay).duration(220).springify().damping(18)
      }
      style={style}
    >
      {children}
    </Animated.View>
  );
}
