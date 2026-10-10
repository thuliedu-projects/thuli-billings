import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
  type SharedValue,
} from 'react-native-reanimated';

import { timings, useReducedMotion } from '@/lib/motion';
import { theme } from '@/lib/theme';

const OTP_LENGTH = 6;

type OtpInputProps = {
  value: string;
  onChange: (code: string) => void;
  autoFocus?: boolean;
  error?: boolean;
};

/** Six-box OTP entry matching the verify-phone mockup. */
export function OtpInput({ value, onChange, autoFocus = true, error }: OtpInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const reduced = useReducedMotion();
  const errorProg = useSharedValue(0);

  useEffect(() => {
    errorProg.value = withTiming(error ? 1 : 0, timings.fast);
  }, [error, errorProg]);

  const digits = value.replace(/\D/g, '').slice(0, OTP_LENGTH).split('');
  const activeIndex = Math.min(digits.length, OTP_LENGTH - 1);

  function setCode(next: string) {
    onChange(next.replace(/\D/g, '').slice(0, OTP_LENGTH));
  }

  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => inputRef.current?.focus()}
      style={styles.wrap}
    >
      <View style={styles.boxes}>
        {Array.from({ length: OTP_LENGTH }, (_, index) => {
          const digit = digits[index] ?? '';
          const isActive = focused && index === activeIndex;

          return (
            <OtpBox
              key={index}
              digit={digit}
              isActive={isActive}
              errorProg={errorProg}
              reduced={reduced}
            />
          );
        })}
      </View>

      <TextInput
        ref={inputRef}
        value={digits.join('')}
        onChangeText={setCode}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={OTP_LENGTH}
        autoFocus={autoFocus}
        caretHidden
        style={styles.inputOverlay}
        accessibilityLabel="One-time password"
      />
    </Pressable>
  );
}

function OtpBox({
  digit,
  isActive,
  errorProg,
  reduced,
}: {
  digit: string;
  isActive: boolean;
  errorProg: SharedValue<number>;
  reduced: boolean;
}) {
  const focus = useSharedValue(isActive ? 1 : 0);
  const filled = useSharedValue(digit ? 1 : 0);

  useEffect(() => {
    focus.value = withTiming(isActive ? 1 : 0, timings.fast);
  }, [focus, isActive]);

  useEffect(() => {
    filled.value = withTiming(digit ? 1 : 0, timings.fast);
  }, [digit, filled]);

  const boxStyle = useAnimatedStyle(() => {
    const idle = interpolateColor(
      filled.value,
      [0, 1],
      [theme.border, theme.purpleBorder],
    );
    const focused = theme.borderFocus;
    const base = interpolateColor(focus.value, [0, 1], [idle, focused]);
    return {
      borderColor: interpolateColor(errorProg.value, [0, 1], [base, theme.danger]),
      transform: [{ scale: 1 + focus.value * 0.04 }],
      backgroundColor: interpolateColor(focus.value, [0, 1], [theme.white, theme.purpleSoft]),
    };
  });

  return (
    <Animated.View style={[styles.box, boxStyle]}>
      {digit ? (
        <Animated.Text
          entering={reduced ? FadeIn.duration(0) : ZoomIn.duration(140)}
          style={styles.digit}
        >
          {digit}
        </Animated.Text>
      ) : isActive ? (
        <View style={styles.caret} />
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    position: 'relative',
  },
  inputOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.02,
    color: 'transparent',
    zIndex: 2,
  },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    pointerEvents: 'none',
  },
  box: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  digit: {
    color: theme.purpleDark,
    fontSize: 20,
    fontWeight: '700',
  },
  caret: {
    width: 2,
    height: 22,
    borderRadius: 1,
    backgroundColor: theme.purple,
  },
});
