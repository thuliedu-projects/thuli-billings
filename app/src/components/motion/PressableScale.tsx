import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { motion, springs, timings, useReducedMotion } from '@/lib/motion';

import { haptic, type HapticKind } from './haptics';

type PressableScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Scale while pressed. Default soft press for cards/rows. */
  scaleTo?: number;
  hapticOnPress?: HapticKind | false;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** Pressable with UI-thread scale feedback — primary micro-interaction primitive. */
export function PressableScale({
  children,
  style,
  scaleTo = motion.pressScale,
  hapticOnPress = 'light',
  disabled,
  onPressIn,
  onPressOut,
  onPress,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      accessibilityRole="button"
      disabled={disabled}
      onPressIn={(e) => {
        if (!reduced && !disabled) {
          scale.value = withTiming(scaleTo, timings.micro);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        if (!reduced) {
          scale.value = withSpring(1, springs.snappy);
        }
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (hapticOnPress && !disabled) haptic(hapticOnPress);
        onPress?.(e);
      }}
      style={[animStyle, style]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
