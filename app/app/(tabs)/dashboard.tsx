import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AnimatedNumber,
  FadeInView,
  PressableScale,
} from '@/components/motion';
import { SalesOverviewChart } from '@/features/analytics';
import {
  SAMPLE_MONTH_SALES,
  SAMPLE_PRODUCTS,
  SAMPLE_RECENT_BILLS,
  SAMPLE_TODAY_STATS,
  SAMPLE_WEEK_SALES,
  formatInr,
  formatStockQty,
  stockStatus,
  useDemo,
  type DemoProduct,
} from '@/features/demo';
import { theme } from '@/lib/theme';

type Period = 'week' | 'month';

/** Home snapshot — layout from the dashboard mockup. */
export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  /** Side-by-side only on wide layouts — phone columns clip titles/names. */
  const twoCol = width >= 700;
  const { storeName, products } = useDemo();
  const [period, setPeriod] = useState<Period>('week');
  const [periodOpen, setPeriodOpen] = useState(false);

  const catalog = products.length > 0 ? products : SAMPLE_PRODUCTS;
  const lowStockCount = catalog.filter((p) => stockStatus(p.stock) !== 'in').length;
  const lowStockItems = useMemo(
    () =>
      [...catalog]
        .sort((a, b) => a.stock - b.stock)
        .slice(0, 3)
        .sort((a, b) => b.stock - a.stock),
    [catalog],
  );

  const series = period === 'week' ? SAMPLE_WEEK_SALES : SAMPLE_MONTH_SALES;
  const periodTotal = series.reduce((sum, point) => sum + point.value, 0);
  const periodChange = period === 'week' ? 12.5 : 8.2;
  const periodLabel = period === 'week' ? 'This Week' : 'This Month';
  const vsLabel = period === 'week' ? 'vs last week' : 'vs last month';

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <FadeInView delay={0} direction="down">
          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>Dashboard</Text>
              <PressableScale
                onPress={() => router.push('/(settings)/stores')}
                style={styles.storeRow}
                hitSlop={8}
                scaleTo={0.98}
                hapticOnPress="selection"
              >
                <Text style={styles.storeName}>{storeName}</Text>
                <Ionicons name="chevron-forward" size={14} color={theme.purple} />
              </PressableScale>
            </View>
            <View style={styles.headerActions}>
              <PressableScale
                onPress={() => router.push('/(analytics)')}
                style={styles.storeBtn}
                accessibilityLabel="Analytics"
                scaleTo={0.92}
              >
                <Ionicons name="stats-chart-outline" size={20} color={theme.purple} />
              </PressableScale>
              <PressableScale
                onPress={() => router.push('/(settings)/stores')}
                style={styles.storeBtn}
                accessibilityLabel="Stores"
                scaleTo={0.92}
              >
                <Ionicons name="storefront-outline" size={20} color={theme.purple} />
              </PressableScale>
            </View>
          </View>
        </FadeInView>

        <View style={styles.stats}>
          <StatCard
            index={0}
            icon="bag-handle-outline"
            iconBg={theme.purpleSoft}
            iconColor={theme.purple}
            label="Today's Sales"
            value={SAMPLE_TODAY_STATS.sales}
            format={(n) => formatInr(Math.round(n))}
            valueColor={theme.purple}
            hint={`${SAMPLE_TODAY_STATS.bills} Bills`}
            onPress={() => router.push('/(tabs)/bills')}
          />
          <StatCard
            index={1}
            icon="cart-outline"
            iconBg={theme.successSoft}
            iconColor="#2E9B57"
            label="Today's Orders"
            value={SAMPLE_TODAY_STATS.orders}
            valueColor="#2E9B57"
            hint={`${SAMPLE_TODAY_STATS.pending} Pending`}
            onPress={() => router.push('/(tabs)/bills')}
          />
          <StatCard
            index={2}
            icon="cube-outline"
            iconBg={theme.warningSoft}
            iconColor="#E39B2B"
            label="Total Products"
            value={catalog.length}
            valueColor="#E39B2B"
            hint={`${lowStockCount} Low Stock`}
            onPress={() => router.push('/(tabs)/products')}
          />
        </View>

        <Animated.View entering={FadeInDown.delay(120).duration(280)} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sales Overview</Text>
            <View style={styles.overviewActions}>
              <PressableScale onPress={() => router.push('/(analytics)')} scaleTo={0.96} hapticOnPress="selection">
                <Text style={styles.viewAll}>Details</Text>
              </PressableScale>
              <PressableScale
                style={styles.periodBtn}
                onPress={() => setPeriodOpen(true)}
                scaleTo={0.96}
                hapticOnPress="selection"
              >
                <Text style={styles.periodLabel}>{periodLabel}</Text>
                <Ionicons name="chevron-down" size={14} color={theme.purple} />
              </PressableScale>
            </View>
          </View>

          <View style={styles.overviewBody}>
            <Text style={styles.overviewKicker}>Total Sales</Text>
            <AnimatedNumber
              value={periodTotal}
              format={(n) => formatInr(Math.round(n))}
              style={styles.overviewTotal}
            />
            <View style={styles.overviewRow}>
              <View style={styles.overviewMeta}>
                <View style={styles.changeRow}>
                  <Ionicons name="arrow-up" size={12} color={theme.success} />
                  <Text style={styles.changeValue}>{periodChange}%</Text>
                </View>
                <Text style={styles.vsLabel}>{vsLabel}</Text>
              </View>
              <View style={styles.chartWrap}>
                <SalesOverviewChart points={series} />
              </View>
            </View>
          </View>
        </Animated.View>

        <View style={[styles.columns, !twoCol && styles.columnsStack]}>
          <Animated.View
            entering={FadeInDown.delay(180).duration(280)}
            style={[styles.card, styles.columnCard, !twoCol && styles.columnCardStack]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Low Stock Alert</Text>
              <PressableScale onPress={() => router.push('/(tabs)/stock')} scaleTo={0.96} hapticOnPress="selection">
                <Text style={styles.viewAll}>View All</Text>
              </PressableScale>
            </View>
            {lowStockItems.map((item) => (
              <LowStockRow key={item.id} product={item} />
            ))}
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(220).duration(280)}
            style={[styles.card, styles.columnCard, !twoCol && styles.columnCardStack]}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Recent Bills</Text>
              <PressableScale
                onPress={() => router.push('/(tabs)/bills?tab=history')}
                scaleTo={0.96}
                hapticOnPress="selection"
              >
                <Text style={styles.viewAll}>View All</Text>
              </PressableScale>
            </View>
            {SAMPLE_RECENT_BILLS.map((bill) => (
              <PressableScale
                key={bill.id}
                style={styles.billRow}
                onPress={() => router.push('/(tabs)/bills?tab=history')}
                scaleTo={0.985}
              >
                <View style={styles.billIcon}>
                  <Ionicons name="document-text-outline" size={16} color={theme.purple} />
                </View>
                <View style={styles.billCopy}>
                  <Text style={styles.billNumber}>{bill.number}</Text>
                  <Text style={styles.billDate} numberOfLines={1}>
                    {bill.billedAt}
                  </Text>
                </View>
                <View style={styles.billMeta}>
                  <Text style={styles.billAmount}>{formatInr(bill.amount)}</Text>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidText}>
                      {bill.status === 'paid' ? 'Paid' : 'Pending'}
                    </Text>
                  </View>
                </View>
              </PressableScale>
            ))}
          </Animated.View>
        </View>
      </ScrollView>

      <Modal
        visible={periodOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPeriodOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPeriodOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            {(['week', 'month'] as const).map((value) => (
              <PressableScale
                key={value}
                style={styles.menuRow}
                scaleTo={0.98}
                hapticOnPress="selection"
                onPress={() => {
                  setPeriod(value);
                  setPeriodOpen(false);
                }}
              >
                <Text style={[styles.menuLabel, period === value && styles.menuLabelActive]}>
                  {value === 'week' ? 'This Week' : 'This Month'}
                </Text>
                {period === value ? (
                  <Ionicons name="checkmark" size={18} color={theme.purple} />
                ) : null}
              </PressableScale>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function StatCard({
  index,
  icon,
  iconBg,
  iconColor,
  label,
  value,
  format,
  valueColor,
  hint,
  onPress,
}: {
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  value: number;
  format?: (n: number) => string;
  valueColor: string;
  hint: string;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(40 + index * 50).duration(260)} style={{ flex: 1 }}>
      <PressableScale style={styles.statCard} onPress={onPress} scaleTo={0.97}>
        <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={styles.statLabel}>{label}</Text>
        <AnimatedNumber
          value={value}
          format={format}
          style={[styles.statValue, { color: valueColor }]}
        />
        <Text style={styles.statHint}>{hint}</Text>
      </PressableScale>
    </Animated.View>
  );
}

function LowStockRow({ product }: { product: DemoProduct }) {
  const qtyColor = product.stock <= 0 ? theme.danger : '#E39B2B';
  return (
    <View style={styles.stockRow}>
      <View style={styles.thumb}>
        <Text style={styles.emoji}>{product.emoji}</Text>
      </View>
      <View style={styles.stockCopy}>
        <Text style={styles.stockName} numberOfLines={2}>
          {product.name}
        </Text>
        <Text style={styles.stockCat}>{product.category}</Text>
      </View>
      <Text style={[styles.stockQty, { color: qtyColor }]}>
        {formatStockQty(product.stock, product.unit)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.white,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: theme.purpleDark,
    fontSize: 28,
    fontWeight: '800',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  storeName: {
    color: theme.purple,
    fontSize: 13,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  storeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  statCard: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 12,
    backgroundColor: theme.white,
  },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '800',
  },
  statHint: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 11,
  },
  card: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 16,
    padding: 14,
    backgroundColor: theme.white,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  overviewActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardTitle: {
    flexShrink: 1,
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '800',
  },
  periodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.purpleSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  periodLabel: {
    color: theme.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  overviewBody: {
    gap: 0,
  },
  overviewRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  overviewMeta: {
    width: 84,
    paddingTop: 36,
  },
  overviewKicker: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  overviewTotal: {
    marginTop: 4,
    color: theme.purpleDark,
    fontSize: 26,
    fontWeight: '800',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeValue: {
    color: theme.success,
    fontSize: 13,
    fontWeight: '700',
  },
  vsLabel: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  chartWrap: {
    flex: 1,
    minWidth: 0,
    marginLeft: -8,
  },
  columns: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'stretch',
  },
  columnsStack: {
    flexDirection: 'column',
  },
  columnCard: {
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  columnCardStack: {
    flex: 0,
    marginBottom: 12,
  },
  viewAll: {
    flexShrink: 0,
    color: theme.purple,
    fontSize: 12,
    fontWeight: '700',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: theme.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 20,
  },
  stockCopy: {
    flex: 1,
    minWidth: 0,
  },
  stockName: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  stockCat: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  stockQty: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: '800',
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  billIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billCopy: {
    flex: 1,
  },
  billNumber: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '800',
  },
  billDate: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 10,
  },
  billMeta: {
    alignItems: 'flex-end',
  },
  billAmount: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '800',
  },
  paidBadge: {
    marginTop: 4,
    backgroundColor: theme.successSoft,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  paidText: {
    color: theme.success,
    fontSize: 10,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,22,48,0.28)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  menuCard: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 12,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  menuLabel: {
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '600',
  },
  menuLabelActive: {
    color: theme.purple,
    fontWeight: '800',
  },
});
