import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { timings } from '@/lib/motion';
import { theme } from '@/lib/theme';

type IconName = keyof typeof Ionicons.glyphMap;

type AuthFieldProps = TextInputProps & {
  label: string;
  required?: boolean;
  optional?: boolean;
  icon: IconName;
  helperText?: string;
  errorText?: string;
  focused?: boolean;
  onFocusChange?: (focused: boolean) => void;
};

export function AuthField({
  label,
  required,
  optional,
  icon,
  helperText,
  errorText,
  focused,
  onFocusChange,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: AuthFieldProps) {
  const focus = useSharedValue(focused ? 1 : 0);
  const error = useSharedValue(errorText ? 1 : 0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, timings.fast);
  }, [focus, focused]);

  useEffect(() => {
    error.value = withTiming(errorText ? 1 : 0, timings.fast);
  }, [error, errorText]);

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      error.value,
      [0, 1],
      [
        interpolateColor(focus.value, [0, 1], [theme.border, theme.borderFocus]),
        theme.danger,
      ],
    ),
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [theme.white, theme.purpleSoft],
    ),
  }));

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
        {optional ? <Text style={styles.optional}> (Optional)</Text> : null}
      </Text>
      <Animated.View style={[styles.field, fieldStyle]}>
        <Ionicons
          name={icon}
          size={18}
          color={errorText ? theme.danger : theme.purple}
          style={styles.icon}
        />
        <TextInput
          placeholderTextColor={theme.textPlaceholder}
          style={[styles.input, style]}
          onFocus={(e) => {
            onFocusChange?.(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            onFocusChange?.(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
      </Animated.View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
      {!errorText && helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

type MobileFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  countryCode?: string;
  onPressCountryCode?: () => void;
  focused?: boolean;
  onFocusChange?: (focused: boolean) => void;
  errorText?: string;
};

/** Login-style mobile input with +91 country selector. */
export function MobileNumberField({
  value,
  onChangeText,
  countryCode = '+91',
  onPressCountryCode,
  focused,
  onFocusChange,
  errorText,
}: MobileFieldProps) {
  const focus = useSharedValue(focused ? 1 : 0);
  const error = useSharedValue(errorText ? 1 : 0);

  useEffect(() => {
    focus.value = withTiming(focused ? 1 : 0, timings.fast);
  }, [focus, focused]);

  useEffect(() => {
    error.value = withTiming(errorText ? 1 : 0, timings.fast);
  }, [error, errorText]);

  const fieldStyle = useAnimatedStyle(() => ({
    borderColor: interpolateColor(
      error.value,
      [0, 1],
      [
        interpolateColor(focus.value, [0, 1], [theme.border, theme.borderFocus]),
        theme.danger,
      ],
    ),
    backgroundColor: interpolateColor(
      focus.value,
      [0, 1],
      [theme.white, theme.purpleSoft],
    ),
  }));

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Ionicons name="call-outline" size={14} color={theme.purple} />
        <Text style={[styles.label, styles.labelInline]}>Mobile Number</Text>
      </View>
      <Animated.View style={[styles.field, fieldStyle]}>
        <Pressable style={styles.country} onPress={onPressCountryCode} hitSlop={8}>
          <Text style={styles.countryText}>{countryCode}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.textSecondary} />
        </Pressable>
        <View style={styles.divider} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder="Enter your mobile number"
          placeholderTextColor={theme.textPlaceholder}
          keyboardType="number-pad"
          maxLength={10}
          style={styles.input}
          onFocus={() => onFocusChange?.(true)}
          onBlur={() => onFocusChange?.(false)}
        />
      </Animated.View>
      {errorText ? <Text style={styles.error}>{errorText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  label: {
    marginBottom: 8,
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  labelInline: {
    marginBottom: 0,
  },
  required: {
    color: theme.danger,
  },
  optional: {
    color: theme.textSecondary,
    fontWeight: '500',
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    backgroundColor: theme.white,
    paddingHorizontal: 12,
    minHeight: 48,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: theme.text,
    fontSize: 14,
    paddingVertical: 12,
  },
  helper: {
    marginTop: 6,
    color: theme.textSecondary,
    fontSize: 11,
  },
  error: {
    marginTop: 6,
    color: theme.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  countryText: {
    color: theme.text,
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    width: 1,
    height: 22,
    backgroundColor: theme.border,
    marginRight: 10,
  },
});
