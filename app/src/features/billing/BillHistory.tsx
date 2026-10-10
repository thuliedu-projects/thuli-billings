import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AnimatedNavMenu } from '@/components/AnimatedNavMenu';
import { EmptyState, ListItemEnter, PressableScale, useToast } from '@/components/motion';
import { AuthBackground } from '@/features/auth';
import {
  SAMPLE_BILL_HISTORY,
  formatInr,
  useDemo,
  type DemoBill,
} from '@/features/demo';
import { theme } from '@/lib/theme';

export type BillsPane = 'new' | 'history';
type HistoryFilter =
  | 'all'
  | 'week'
  | 'month'
  | 'lastMonth'
  | 'paid'
  | 'pending'
  | 'cash'
  | 'upi';

const MODE_TABS = [
  { value: 'new' as const, label: 'New Bill', icon: 'add-circle-outline' as const },
  { value: 'history' as const, label: 'History', icon: 'time-outline' as const },
];

type FilterOption = { value: HistoryFilter; label: string };

const FILTER_GROUPS: { title: string; options: FilterOption[] }[] = [
  {
    title: 'Time',
    options: [
      { value: 'all', label: 'All bills' },
      { value: 'week', label: 'Last 7 days' },
      { value: 'month', label: 'This month' },
      { value: 'lastMonth', label: 'Last month' },
    ],
  },
  {
    title: 'Status',
    options: [
      { value: 'paid', label: 'Paid' },
      { value: 'pending', label: 'Pending' },
    ],
  },
  {
    title: 'Payment mode',
    options: [
      { value: 'cash', label: 'Cash' },
      { value: 'upi', label: 'UPI' },
    ],
  },
];

const ALL_FILTERS = FILTER_GROUPS.flatMap((group) => group.options);

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function matchesFilter(bill: DemoBill, filter: HistoryFilter, now: Date) {
  const billed = new Date(bill.billedAtIso);
  if (Number.isNaN(billed.getTime())) return filter === 'all';

  if (filter === 'all') return true;
  if (filter === 'paid') return bill.status === 'paid';
  if (filter === 'pending') return bill.status === 'pending';
  if (filter === 'cash') return bill.paymentMode === 'Cash';
  if (filter === 'upi') return bill.paymentMode === 'UPI';

  if (filter === 'week') {
    const cutoff = startOfDay(now);
    cutoff.setDate(cutoff.getDate() - 6);
    return billed >= cutoff;
  }

  if (filter === 'month') {
    return (
      billed.getFullYear() === now.getFullYear() && billed.getMonth() === now.getMonth()
    );
  }

  if (filter === 'lastMonth') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return (
      billed.getFullYear() === last.getFullYear() && billed.getMonth() === last.getMonth()
    );
  }

  return true;
}

export function BillHistory({
  onChangePane,
}: {
  onChangePane: (pane: BillsPane) => void;
}) {
  const insets = useSafeAreaInsets();
  const { storeName } = useDemo();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const now = new Date();
    return SAMPLE_BILL_HISTORY.filter((bill) => {
      if (!matchesFilter(bill, filter, now)) return false;
      if (!q) return true;
      return (
        bill.number.toLowerCase().includes(q) ||
        bill.customer.toLowerCase().includes(q) ||
        bill.billedAt.toLowerCase().includes(q) ||
        bill.paymentMode.toLowerCase().includes(q) ||
        bill.status.toLowerCase().includes(q)
      );
    });
  }, [filter, query]);

  const filterLabel = ALL_FILTERS.find((o) => o.value === filter)?.label ?? 'All bills';

  function selectFilter(next: HistoryFilter) {
    setFilter(next);
    setFilterOpen(false);
  }

  return (
    <AuthBackground>
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <PressableScale onPress={() => onChangePane('new')} hitSlop={10} style={styles.headerSide} scaleTo={0.9}>
            <Ionicons name="arrow-back" size={22} color={theme.purpleDark} />
          </PressableScale>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Bill History</Text>
            <View style={styles.storeRow}>
              <Text style={styles.storeName}>{storeName}</Text>
              <Ionicons name="chevron-down" size={14} color={theme.purple} />
            </View>
          </View>
          <View style={styles.headerRight}>
            <PressableScale
              onPress={() => {
                Alert.alert('Export', 'Bill export will be available after invoices are added.');
                showToast({ message: 'Export coming soon', tone: 'info' });
              }}
              style={styles.exportBtn}
              scaleTo={0.94}
            >
              <Ionicons name="share-outline" size={18} color={theme.purple} />
              <Text style={styles.exportLabel}>Export</Text>
            </PressableScale>
            <AnimatedNavMenu
              options={MODE_TABS}
              value="history"
              onChange={onChangePane}
              title="Bills"
              align="right"
            />
          </View>
        </View>

        <View style={[styles.search, searchFocused && styles.searchFocused]}>
          <Ionicons name="search" size={18} color={theme.purple} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search by bill number, date or customer"
            placeholderTextColor={theme.textPlaceholder}
            style={styles.searchInput}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Past Bills</Text>
          <PressableScale
            style={styles.filterDropdown}
            onPress={() => setFilterOpen(true)}
            scaleTo={0.97}
            hapticOnPress="selection"
          >
            <Text style={styles.filterDropdownLabel} numberOfLines={1}>
              {filterLabel}
            </Text>
            <Ionicons name="chevron-down" size={16} color={theme.purple} />
          </PressableScale>
        </View>

        <Text style={styles.listCount}>Total Bills ({list.length})</Text>

        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <ListItemEnter index={index}>
              <HistoryRow bill={item} />
            </ListItemEnter>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="document-text-outline"
              title="No bills match this filter"
              body="Try another filter or clear your search."
            />
          }
        />

        <Modal
          visible={filterOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setFilterOpen(false)}
        >
          <Pressable style={styles.dropdownBackdrop} onPress={() => setFilterOpen(false)}>
            <Pressable style={[styles.dropdownCard, { marginTop: insets.top + 120 }]} onPress={() => undefined}>
              <View style={styles.dropdownHeader}>
                <Text style={styles.dropdownTitle}>Filter bills</Text>
                <Pressable onPress={() => setFilterOpen(false)} hitSlop={8}>
                  <Ionicons name="close" size={18} color={theme.purpleDark} />
                </Pressable>
              </View>
              {FILTER_GROUPS.map((group) => (
                <View key={group.title} style={styles.dropdownGroup}>
                  <Text style={styles.dropdownGroupTitle}>{group.title}</Text>
                  {group.options.map((option) => {
                    const active = filter === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        style={[styles.dropdownOption, active && styles.dropdownOptionActive]}
                        onPress={() => selectFilter(option.value)}
                      >
                        <Text
                          style={[
                            styles.dropdownOptionLabel,
                            active && styles.dropdownOptionLabelActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                        {active ? (
                          <Ionicons name="checkmark" size={18} color={theme.purple} />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </AuthBackground>
  );
}

function HistoryRow({ bill }: { bill: DemoBill }) {
  const itemLabel = `${bill.itemCount} ${bill.itemCount === 1 ? 'item' : 'items'}`;
  return (
    <PressableScale style={styles.row} scaleTo={0.985} hapticOnPress="selection">
      <View style={styles.icon}>
        <Ionicons name="document-text-outline" size={18} color={theme.purple} />
      </View>
      <View style={styles.main}>
        <Text style={styles.billNo}>Bill #{bill.number}</Text>
        <Text style={styles.meta}>
          {itemLabel} • {bill.paymentMode}
        </Text>
        <Text style={styles.customer}>{bill.customer}</Text>
      </View>
      <View style={styles.aside}>
        <Text style={styles.amount}>{formatInr(bill.amount)}</Text>
        <View style={[styles.badge, bill.status !== 'paid' && styles.badgePending]}>
          <Text style={[styles.badgeText, bill.status !== 'paid' && styles.badgeTextPending]}>
            {bill.status === 'paid' ? 'Paid' : 'Pending'}
          </Text>
        </View>
        <Text style={styles.date}>{bill.billedAt}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.purpleMuted} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 12,
  },
  headerSide: {
    width: 40,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: theme.purpleDark,
    fontSize: 20,
    fontWeight: '800',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  storeName: {
    color: theme.purple,
    fontSize: 12,
    fontWeight: '600',
  },
  exportBtn: {
    width: 44,
    alignItems: 'center',
  },
  exportLabel: {
    marginTop: 2,
    color: theme.purple,
    fontSize: 11,
    fontWeight: '700',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    minHeight: 46,
    backgroundColor: theme.white,
    marginBottom: 12,
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
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
    gap: 12,
  },
  listTitle: {
    color: theme.purpleDark,
    fontSize: 16,
    fontWeight: '800',
  },
  filterDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '58%',
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.white,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  filterDropdownLabel: {
    flexShrink: 1,
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  listCount: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,22,48,0.35)',
    paddingHorizontal: 16,
  },
  dropdownCard: {
    backgroundColor: theme.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 8,
    maxHeight: '70%',
    shadowColor: theme.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
  },
  dropdownTitle: {
    color: theme.purpleDark,
    fontSize: 15,
    fontWeight: '800',
  },
  dropdownGroup: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  dropdownGroupTitle: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownOptionActive: {
    backgroundColor: theme.purpleSoft,
  },
  dropdownOptionLabel: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownOptionLabelActive: {
    color: theme.purple,
    fontWeight: '700',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    gap: 10,
    flexGrow: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  main: {
    flex: 1,
  },
  billNo: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '800',
  },
  meta: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 12,
  },
  customer: {
    marginTop: 2,
    color: theme.purpleMuted,
    fontSize: 12,
  },
  aside: {
    alignItems: 'flex-end',
    minWidth: 96,
  },
  amount: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '800',
  },
  badge: {
    marginTop: 4,
    backgroundColor: theme.successSoft,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgePending: {
    backgroundColor: theme.warningSoft,
  },
  badgeText: {
    color: theme.success,
    fontSize: 10,
    fontWeight: '700',
  },
  badgeTextPending: {
    color: theme.warning,
  },
  date: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 10,
  },
});
