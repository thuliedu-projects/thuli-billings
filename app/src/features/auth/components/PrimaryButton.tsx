import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { PressableScale, haptic } from '@/components/motion';
import { motion, springs, timings } from '@/lib/motion';
import { theme } from '@/lib/theme';

type PrimaryButtonProps = {
  label: string;
  loading?: boolean;
  success?: boolean;
  successLabel?: string;
  showArrow?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function PrimaryButton({
  label,
  loading,
  success,
  successLabel = 'Saved',
  showArrow,
  disabled,
  onPress,
  style,
}: PrimaryButtonProps) {
  const isDisabled = Boolean(disabled || loading);
  const [showSuccess, setShowSuccess] = useState(false);
  const scale = useSharedValue(1);

  useEffect(() => {
    if (!success) return;
    setShowSuccess(true);
    scale.value = withSpring(1.02, springs.snappy);
    haptic('success');
    const t = setTimeout(() => {
      setShowSuccess(false);
      scale.value = withTiming(1, timings.fast);
    }, 1400);
    return () => clearTimeout(t);
  }, [scale, success]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <PressableScale
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, busy: Boolean(loading) }}
        disabled={isDisabled}
        onPress={onPress}
        scaleTo={motion.pressScaleHard}
        hapticOnPress={isDisabled ? false : 'medium'}
        style={[
          styles.button,
          isDisabled && styles.disabled,
          showSuccess && styles.success,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.white} />
        ) : showSuccess ? (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(120)} style={styles.content}>
            <Ionicons name="checkmark-circle" size={20} color={theme.white} />
            <Text style={styles.label}>{successLabel}</Text>
          </Animated.View>
        ) : (
          <View
            style={[styles.content, showArrow && styles.contentSpread]}
            pointerEvents="none"
          >
            <Text style={styles.label}>{label}</Text>
            {showArrow ? (
              <Ionicons name="arrow-forward" size={18} color={theme.white} style={styles.arrow} />
            ) : null}
          </View>
        )}
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: theme.purple,
    borderRadius: 10,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  contentSpread: {
    width: '100%',
  },
  label: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  arrow: {
    position: 'absolute',
    right: 0,
  },
  disabled: {
    opacity: 0.55,
  },
  success: {
    backgroundColor: theme.success,
  },
});
