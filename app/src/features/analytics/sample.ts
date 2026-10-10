import type { SalesPoint } from '@/features/demo';

export type AnalyticsRange = 'week' | 'month' | 'half';

export type PaymentSplit = {
  mode: 'UPI' | 'Cash';
  amount: number;
  color: string;
};

export type TopSku = {
  name: string;
  emoji: string;
  qty: number;
  amount: number;
};

export type AnalyticsSnapshot = {
  range: AnalyticsRange;
  title: string;
  subtitle: string;
  total: number;
  changePct: number;
  vsLabel: string;
  bills: number;
  items: number;
  peakLabel: string;
  peakHint: string;
  series: SalesPoint[];
  payments: PaymentSplit[];
  topProducts: TopSku[];
};

const PAYMENT_COLORS = {
  UPI: '#6B2D9B',
  Cash: '#2E9B57',
} as const;

export const ANALYTICS_TABS = [
  { value: 'week' as const, label: 'Week' },
  { value: 'month' as const, label: 'Month' },
  { value: 'half' as const, label: '6 Mo' },
];

export const ANALYTICS_BY_RANGE: Record<AnalyticsRange, AnalyticsSnapshot> = {
  week: {
    range: 'week',
    title: 'This week',
    subtitle: '25 May – 31 May',
    total: 12450,
    changePct: 12.5,
    vsLabel: 'vs last week',
    bills: 28,
    items: 64,
    peakLabel: '31 May',
    peakHint: 'Highest sales day',
    series: [
      { label: '25 May', value: 820 },
      { label: '26 May', value: 980 },
      { label: '27 May', value: 1680 },
      { label: '28 May', value: 1840 },
      { label: '29 May', value: 2280 },
      { label: '30 May', value: 2150 },
      { label: '31 May', value: 2700 },
    ],
    payments: [
      { mode: 'UPI', amount: 6852, color: PAYMENT_COLORS.UPI },
      { mode: 'Cash', amount: 5598, color: PAYMENT_COLORS.Cash },
    ],
    topProducts: [
      { name: 'Maggi Noodles 70g', emoji: '🍜', qty: 18, amount: 252 },
      { name: 'Coca Cola 250ml', emoji: '🥤', qty: 14, amount: 420 },
      { name: 'Lays Classic 52g', emoji: '🥔', qty: 12, amount: 240 },
      { name: 'Parle-G Biscuit 100g', emoji: '🍪', qty: 9, amount: 90 },
    ],
  },
  month: {
    range: 'month',
    title: 'This month',
    subtitle: 'May 2026',
    total: 37550,
    changePct: 8.2,
    vsLabel: 'vs last month',
    bills: 86,
    items: 210,
    peakLabel: 'Week 3',
    peakHint: 'Highest sales week',
    series: [
      { label: 'W1', value: 7200 },
      { label: 'W2', value: 8100 },
      { label: 'W3', value: 12450 },
      { label: 'W4', value: 9800 },
    ],
    payments: [
      { mode: 'UPI', amount: 20653, color: PAYMENT_COLORS.UPI },
      { mode: 'Cash', amount: 16897, color: PAYMENT_COLORS.Cash },
    ],
    topProducts: [
      { name: 'Maggi Noodles 70g', emoji: '🍜', qty: 62, amount: 868 },
      { name: 'Coca Cola 250ml', emoji: '🥤', qty: 48, amount: 1440 },
      { name: 'Tide Plus Detergent 1kg', emoji: '🧴', qty: 21, amount: 3045 },
      { name: 'Amul Taaza Milk 1L', emoji: '🥛', qty: 36, amount: 2448 },
    ],
  },
  half: {
    range: 'half',
    title: 'Last 6 months',
    subtitle: 'Apr – Sep 2026',
    total: 177800,
    changePct: 6.4,
    vsLabel: 'vs prior 6 months',
    bills: 412,
    items: 980,
    peakLabel: 'May',
    peakHint: 'Highest sales month',
    series: [
      { label: 'Apr', value: 28900 },
      { label: 'May', value: 37550 },
      { label: 'Jun', value: 33200 },
      { label: 'Jul', value: 30100 },
      { label: 'Aug', value: 35600 },
      { label: 'Sep', value: 12450 },
    ],
    payments: [
      { mode: 'UPI', amount: 97790, color: PAYMENT_COLORS.UPI },
      { mode: 'Cash', amount: 80010, color: PAYMENT_COLORS.Cash },
    ],
    topProducts: [
      { name: 'Tide Plus Detergent 1kg', emoji: '🧴', qty: 94, amount: 13630 },
      { name: 'Coca Cola 250ml', emoji: '🥤', qty: 210, amount: 6300 },
      { name: 'Amul Taaza Milk 1L', emoji: '🥛', qty: 168, amount: 11424 },
      { name: 'Surf Excel Quick Wash 1kg', emoji: '🫧', qty: 71, amount: 11360 },
    ],
  },
};
