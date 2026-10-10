import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { theme } from '@/lib/theme';
import { useReducedMotion } from '@/lib/motion';

type SkeletonProps = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

/** Shimmer placeholder that mirrors content shape. */
export function Skeleton({ width = '100%', height = 14, radius = 8, style }: SkeletonProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      progress.value = 0.45;
      return;
    }
    progress.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [progress, reduced]);

  const anim = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.35, 0.85]),
  }));

  return (
    <Animated.View
      style={[
        styles.base,
        { width: width as number | `${number}%`, height, borderRadius: radius },
        anim,
        style,
      ]}
    />
  );
}

export function SkeletonCard({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.card, style]}>
      <Skeleton width={36} height={36} radius={18} />
      <Skeleton width="70%" height={12} style={styles.gap} />
      <Skeleton width="45%" height={18} style={styles.gap} />
      <Skeleton width="55%" height={10} style={styles.gap} />
    </View>
  );
}

export function SkeletonRow({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.row, style]}>
      <Skeleton width={42} height={42} radius={10} />
      <View style={styles.rowMain}>
        <Skeleton width="65%" height={13} />
        <Skeleton width="40%" height={11} style={styles.gapSm} />
      </View>
      <Skeleton width={48} height={14} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.purpleWave,
  },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: theme.white,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: theme.white,
  },
  rowMain: {
    flex: 1,
  },
  gap: {
    marginTop: 10,
  },
  gapSm: {
    marginTop: 6,
  },
});
