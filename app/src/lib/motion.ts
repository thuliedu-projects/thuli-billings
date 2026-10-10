import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Easing, type WithSpringConfig, type WithTimingConfig } from 'react-native-reanimated';

/** Shared motion tokens — keep interactions snappy and consistent. */
export const motion = {
  /** Press / micro feedback */
  micro: 120,
  /** Standard UI transitions */
  fast: 200,
  standard: 280,
  /** Larger reveals (sheets, empty states) */
  reveal: 360,
  pressScale: 0.97,
  pressScaleSoft: 0.985,
  pressScaleHard: 0.94,
} as const;

export const springs = {
  snappy: { damping: 18, stiffness: 320, mass: 0.7 } satisfies WithSpringConfig,
  soft: { damping: 16, stiffness: 220, mass: 0.85 } satisfies WithSpringConfig,
  settle: { damping: 20, stiffness: 260, mass: 0.8 } satisfies WithSpringConfig,
} as const;

export const timings = {
  micro: { duration: motion.micro, easing: Easing.out(Easing.quad) } satisfies WithTimingConfig,
  fast: { duration: motion.fast, easing: Easing.out(Easing.cubic) } satisfies WithTimingConfig,
  standard: {
    duration: motion.standard,
    easing: Easing.out(Easing.cubic),
  } satisfies WithTimingConfig,
  reveal: {
    duration: motion.reveal,
    easing: Easing.out(Easing.cubic),
  } satisfies WithTimingConfig,
} as const;

/** Respect OS “Reduce Motion” preference. */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (mounted) setReduced(value);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  return reduced;
}
