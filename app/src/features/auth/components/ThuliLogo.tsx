import { Image, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/lib/theme';

const logoSource = require('../../../../assets/images/thuli-logo.jpg');

type ThuliLogoProps = {
  size?: 'sm' | 'md';
};

export function ThuliLogo({ size = 'md' }: ThuliLogoProps) {
  const compact = size === 'sm';

  return (
    <View style={styles.wrap}>
      <Image
        source={logoSource}
        style={[styles.logo, compact && styles.logoSm]}
        resizeMode="contain"
        accessibilityLabel="THULI — That's How U Learn It"
      />
      <Text style={[styles.product, compact && styles.productSm]}>B i l l i n g s</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  logo: {
    width: 220,
    height: 92,
  },
  logoSm: {
    width: 180,
    height: 76,
  },
  product: {
    marginTop: 10,
    color: theme.purple,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 6,
  },
  productSm: {
    fontSize: 14,
    letterSpacing: 5,
    marginTop: 8,
  },
});
