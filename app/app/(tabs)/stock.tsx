import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnimatedNumber,
  EmptyState,
  ListItemEnter,
  PressableScale,
} from '@/components/motion';
import { stockStatus, useDemo } from '@/features/demo';
import { theme } from '@/lib/theme';

export default function StockScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { products, seedSampleProducts } = useDemo();
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q),
    );
  }, [products, query]);

  const total = products.length;
  const low = products.filter((p) => stockStatus(p.stock) === 'low').length;
  const out = products.filter((p) => stockStatus(p.stock) === 'out').length;
  const inStock = products.filter((p) => stockStatus(p.stock) === 'in').length;

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Stock</Text>
          <Text style={styles.subtitle}>Manage your store inventory</Text>
        </View>
        <PressableScale
          style={styles.adjustBtn}
          onPress={() => router.push('/(tabs)/products')}
          scaleTo={0.94}
        >
          <Ionicons name="swap-horizontal" size={18} color={theme.purple} />
          <Text style={styles.adjustLabel}>Adjust Stock</Text>
        </PressableScale>
      </View>

      <View style={[styles.search, searchFocused && styles.searchFocused]}>
        <Ionicons name="search" size={18} color={theme.purple} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search products"
          placeholderTextColor={theme.textPlaceholder}
          style={styles.searchInput}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
        <Ionicons name="options-outline" size={18} color={theme.purple} />
      </View>

      <View style={styles.stats}>
        <Stat label="Total Products" value={total} color={theme.purple} />
        <Stat label="Low Stock" value={low} color={theme.warning} />
        <Stat label="Out of Stock" value={out} color={theme.danger} />
        <Stat label="In Stock" value={inStock} color={theme.success} />
      </View>

      {list.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="No stock yet"
          body="Import sample inventory or add products to track stock levels."
          ctaLabel="Load sample inventory"
          ctaIcon="download-outline"
          onCta={seedSampleProducts}
        />
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
            const status = stockStatus(item.stock);
            return (
              <ListItemEnter index={index}>
                <PressableScale style={styles.row} scaleTo={0.985} hapticOnPress="selection">
                  <View style={styles.thumb}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.main}>
                    <Text style={styles.name} numberOfLines={1}>
                      {item.name}
                    </Text>
                    <Text style={styles.category}>{item.category}</Text>
                  </View>
                  <Text style={styles.qty}>
                    {item.stock} {item.unit.toLowerCase() === 'nos' ? 'pcs' : item.unit}
                  </Text>
                  <View
                    style={[
                      styles.badge,
                      status === 'in' && styles.badgeIn,
                      status === 'low' && styles.badgeLow,
                      status === 'out' && styles.badgeOut,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        status === 'in' && styles.badgeTextIn,
                        status === 'low' && styles.badgeTextLow,
                        status === 'out' && styles.badgeTextOut,
                      ]}
                    >
                      {status === 'in'
                        ? 'In Stock'
                        : status === 'low'
                          ? 'Low Stock'
                          : 'Out of Stock'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </PressableScale>
              </ListItemEnter>
            );
          }}
        />
      )}

      <PressableScale
        style={styles.fab}
        onPress={() => router.push('/(tabs)/products')}
        scaleTo={0.92}
        hapticOnPress="medium"
      >
        <Ionicons name="add" size={28} color={theme.white} />
      </PressableScale>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <AnimatedNumber value={value} style={[styles.statValue, { color }]} />
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: {
    color: theme.purpleDark,
    fontSize: 24,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 12,
  },
  adjustBtn: {
    alignItems: 'center',
  },
  adjustLabel: {
    marginTop: 2,
    color: theme.purple,
    fontSize: 10,
    fontWeight: '600',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 46,
    marginBottom: 12,
    backgroundColor: theme.white,
  },
  searchFocused: {
    borderColor: theme.borderFocus,
    backgroundColor: theme.purpleSoft,
  },
  searchInput: {
    flex: 1,
    color: theme.text,
    fontSize: 13,
    paddingVertical: 10,
  },
  stats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  stat: {
    flex: 1,
    backgroundColor: theme.backgroundMuted,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 9,
    textAlign: 'center',
  },
  list: {
    paddingBottom: 100,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: theme.white,
  },
  thumb: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  main: { flex: 1 },
  name: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  category: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  qty: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 48,
    textAlign: 'right',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeIn: { backgroundColor: theme.successSoft },
  badgeLow: { backgroundColor: theme.warningSoft },
  badgeOut: { backgroundColor: theme.dangerSoft },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeTextIn: { color: theme.success },
  badgeTextLow: { color: theme.warning },
  badgeTextOut: { color: theme.danger },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 16,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: theme.purple,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5,
    shadowColor: theme.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
});
