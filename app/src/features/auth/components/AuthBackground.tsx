import { StyleSheet, View, type ViewProps } from 'react-native';

import { theme } from '@/lib/theme';

/** Plain auth screen shell (no decorative blobs). */
export function AuthBackground({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.root, style]} {...rest}>
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
  },
  content: {
    flex: 1,
  },
});
