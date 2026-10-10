import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function PosScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>POS</Text>
      <Text style={styles.subtitle}>Fast billing — UI next</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: 8,
    opacity: 0.7,
    textAlign: 'center',
  },
});
