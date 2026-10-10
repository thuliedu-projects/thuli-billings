import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { Text, TextInput } from 'react-native';

/** Inter — modern sans used by Stripe, Linear, and many production apps. */
export const fontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
};

export const fonts = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
} as const;

type DefaultsHost = {
  defaultProps?: { style?: object | object[] | null };
};

/** Apply Inter as the default Text / TextInput face after fonts load. */
export function applyAppFonts() {
  const base = { fontFamily: fonts.regular };

  for (const Component of [Text, TextInput] as DefaultsHost[]) {
    const prev = Component.defaultProps?.style;
    Component.defaultProps = {
      ...Component.defaultProps,
      style: prev ? [base, prev] : base,
    };
  }
}
