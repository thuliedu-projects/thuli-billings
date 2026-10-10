import { useEffect, useRef, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { timings, useReducedMotion } from '@/lib/motion';

import { haptic } from './haptics';

type ShakeViewProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Change this value to trigger a shake (e.g. error counter). */
  trigger: number;
};

/** Subtle horizontal shake for invalid fields / errors. */
export function ShakeView({ children, style, trigger }: ShakeViewProps) {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (reduced || trigger <= 0) return;
    x.value = withSequence(
      withTiming(-6, timings.micro),
      withTiming(6, timings.micro),
      withTiming(-4, timings.micro),
      withTiming(4, timings.micro),
      withTiming(0, timings.micro),
    );
    haptic('error');
  }, [reduced, trigger, x]);

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));

  return <Animated.View style={[anim, style]}>{children}</Animated.View>;
}
