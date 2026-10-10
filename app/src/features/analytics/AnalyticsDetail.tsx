import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedNavMenu } from '@/components/AnimatedNavMenu';
import { formatInr, useDemo } from '@/features/demo';
import { theme } from '@/lib/theme';

import { SalesOverviewChart } from './SalesOverviewChart';
import { ANALYTICS_BY_RANGE, type AnalyticsRange } from './sample';

const RANGE_OPTIONS = [
  { value: 'week' as const, label: 'This Week', icon: 'today-outline' as const },
  { value: 'month' as const, label: 'This Month', icon: 'calendar-outline' as const },
  { value: 'half' as const, label: '6 Months', icon: 'stats-chart-outline' as const },
];

export function AnalyticsDetail() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { storeName } = useDemo();
  const [range, setRange] = useState<AnalyticsRange>('week');
  const snapshot = ANALYTICS_BY_RANGE[range];
  const avgBill = snapshot.bills > 0 ? snapshot.total / snapshot.bills : 0;
  const paymentTotal = snapshot.payments.reduce((sum, p) => sum + p.amount, 0);
  const seriesMax = Math.max(...snapshot.series.map((p) => p.value), 1);
  const seriesNoun = range === 'week' ? 'Day' : range === 'month' ? 'Week' : 'Month';

  const kpis = useMemo(
    () => [
      { label: 'Total sales', value: formatInr(snapshot.total), hint: snapshot.vsLabel },
      { label: 'Bills', value: String(snapshot.bills), hint: `${snapshot.items} items` },
      { label: 'Avg bill', value: formatInr(avgBill), hint: 'Per invoice' },
      {
        label: 'Peak',
        value: snapshot.peakLabel,
        hint: formatInr(snapshot.series.reduce((m, p) => Math.max(m, p.value), 0)),
      },
    ],
    [avgBill, snapshot],
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="arrow-back" size={22} color={theme.purpleDark} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Analytics</Text>
          <Text style={styles.storeName}>{storeName}</Text>
        </View>
        <View style={styles.headerMenu}>
          <AnimatedNavMenu
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
            title="Time range"
            align="right"
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
      >
        <Text style={styles.rangeTitle}>{snapshot.title}</Text>
        <Text style={styles.rangeSub}>{snapshot.subtitle}</Text>

        <View style={styles.kpiGrid}>
          <View style={styles.kpiRow}>
            {kpis.slice(0, 2).map((kpi) => (
              <View key={kpi.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
                  {kpi.value}
                </Text>
                <Text style={styles.kpiHint}>{kpi.hint}</Text>
              </View>
            ))}
          </View>
          <View style={styles.kpiRow}>
            {kpis.slice(2).map((kpi) => (
              <View key={kpi.label} style={styles.kpiCard}>
                <Text style={styles.kpiLabel}>{kpi.label}</Text>
                <Text style={styles.kpiValue} numberOfLines={1} adjustsFontSizeToFit>
                  {kpi.value}
                </Text>
                <Text style={styles.kpiHint}>{kpi.hint}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Sales trend</Text>
            <View style={styles.changeRow}>
              <Ionicons name="arrow-up" size={12} color={theme.success} />
              <Text style={styles.changeValue}>{snapshot.changePct}%</Text>
            </View>
          </View>
          <SalesOverviewChart points={snapshot.series} />
        </View>

        <View style={styles.insight}>
          <View style={styles.insightIcon}>
            <Ionicons name="bulb-outline" size={16} color={theme.purple} />
          </View>
          <Text style={styles.insightText}>
            {snapshot.peakHint}: {snapshot.peakLabel}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>By {seriesNoun.toLowerCase()}</Text>
          {snapshot.series.map((point) => (
            <View key={point.label} style={styles.barRow}>
              <Text style={styles.barLabel} numberOfLines={1}>
                {point.label}
              </Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${Math.max(8, (point.value / seriesMax) * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.barValue}>{formatInr(point.value)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Payment modes</Text>
          <View style={styles.payTrack}>
            {snapshot.payments.map((pay) => (
              <View
                key={pay.mode}
                style={{
                  flex: pay.amount,
                  backgroundColor: pay.color,
                }}
              />
            ))}
          </View>
          {snapshot.payments.map((pay) => {
            const pct = paymentTotal ? Math.round((pay.amount / paymentTotal) * 100) : 0;
            return (
              <View key={pay.mode} style={styles.payRow}>
                <View style={[styles.dot, { backgroundColor: pay.color }]} />
                <Text style={styles.payMode}>{pay.mode}</Text>
                <Text style={styles.payPct}>{pct}%</Text>
                <Text style={styles.payAmt}>{formatInr(pay.amount)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Top products</Text>
          {snapshot.topProducts.map((item, index) => (
            <View key={item.name} style={styles.skuRow}>
              <Text style={styles.skuRank}>{index + 1}</Text>
              <View style={styles.skuThumb}>
                <Text style={styles.skuEmoji}>{item.emoji}</Text>
              </View>
              <View style={styles.skuCopy}>
                <Text style={styles.skuName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.skuQty}>{item.qty} sold</Text>
              </View>
              <Text style={styles.skuAmt}>{formatInr(item.amount)}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  headerBtn: {
    width: 40,
  },
  headerMenu: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: theme.purpleDark,
    fontSize: 20,
    fontWeight: '800',
  },
  storeName: {
    marginTop: 2,
    color: theme.purple,
    fontSize: 12,
    fontWeight: '600',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  rangeTitle: {
    marginTop: 4,
    color: theme.purpleDark,
    fontSize: 22,
    fontWeight: '800',
  },
  rangeSub: {
    marginTop: -6,
    color: theme.textSecondary,
    fontSize: 13,
  },
  kpiGrid: {
    gap: 10,
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 12,
    backgroundColor: theme.white,
  },
  kpiLabel: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  kpiValue: {
    marginTop: 6,
    color: theme.purpleDark,
    fontSize: 18,
    fontWeight: '800',
  },
  kpiHint: {
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
    gap: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: theme.purpleDark,
    fontSize: 15,
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
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.purpleSoft,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  insightIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightText: {
    flex: 1,
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '600',
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    width: 58,
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.purpleSoft,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: theme.purple,
  },
  barValue: {
    width: 78,
    textAlign: 'right',
    color: theme.purpleDark,
    fontSize: 11,
    fontWeight: '700',
  },
  payTrack: {
    height: 10,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  payRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  payMode: {
    flex: 1,
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '600',
  },
  payPct: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    width: 36,
    textAlign: 'right',
  },
  payAmt: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 84,
    textAlign: 'right',
  },
  skuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skuRank: {
    width: 16,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  skuThumb: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: theme.backgroundMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skuEmoji: {
    fontSize: 18,
  },
  skuCopy: {
    flex: 1,
  },
  skuName: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  skuQty: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  skuAmt: {
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '800',
  },
});
