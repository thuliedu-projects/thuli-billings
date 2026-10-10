import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import Animated, { FadeIn, LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  EmptyState,
  ListItemEnter,
  PressableScale,
  useToast,
} from '@/components/motion';
import { AnimatedNavMenu } from '@/components/AnimatedNavMenu';
import { PrimaryButton } from '@/features/auth';
import { BillHistory, type BillsPane } from '@/features/billing';
import { formatInr, productUnitPrice, billGstBreakdown, useDemo } from '@/features/demo';
import {
  loadBillingPreferences,
  type PaymentModeOption,
} from '@/features/settings';
import { theme } from '@/lib/theme';

const PANE_TABS = [
  { value: 'new' as const, label: 'New Bill', icon: 'add-circle-outline' as const },
  { value: 'history' as const, label: 'History', icon: 'time-outline' as const },
];

const PAYMENT_MODES: PaymentModeOption[] = ['Cash', 'UPI'];

export default function BillsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { showToast } = useToast();
  const [pane, setPane] = useState<BillsPane>(params.tab === 'history' ? 'history' : 'new');
  const {
    stores,
    activeStoreId,
    setActiveStore,
    storeName,
    products,
    cart,
    billDiscount,
    setBillDiscount,
    addToCart,
    updateCartQty,
    removeFromCart,
    clearCart,
    seedSampleProducts,
  } = useDemo();
  const [query, setQuery] = useState('');
  const [paymentMode, setPaymentMode] = useState<PaymentModeOption>('Cash');
  const [paying, setPaying] = useState(false);
  const [paySuccess, setPaySuccess] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [billDiscountText, setBillDiscountText] = useState('');

  useEffect(() => {
    if (params.tab === 'history') setPane('history');
    if (params.tab === 'new') setPane('new');
  }, [params.tab]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const prefs = await loadBillingPreferences();
      if (cancelled) return;
      setPaymentMode(prefs.defaultPaymentMode);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setBillDiscountText(billDiscount ? String(billDiscount) : '');
  }, [billDiscount, activeStoreId]);

  const selectPane = useCallback(
    (next: BillsPane) => {
      setPane(next);
      router.setParams({ tab: next });
    },
    [router],
  );

  const catalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = products.length ? products : [];
    if (!q) return list;
    return list.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, query]);

  const lines = useMemo(() => {
    return cart
      .map((line) => {
        const product = products.find((p) => p.id === line.productId);
        if (!product) return null;
        const unitPrice = productUnitPrice(product);
        return {
          ...line,
          product,
          unitPrice,
          subtotal: unitPrice * line.quantity,
        };
      })
      .filter(Boolean) as {
      productId: string;
      quantity: number;
      product: (typeof products)[number];
      unitPrice: number;
      subtotal: number;
    }[];
  }, [cart, products]);

  const totalItems = lines.length;
  const totalQty = lines.reduce((sum, line) => sum + line.quantity, 0);
  const subtotalAmount = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const appliedBillDiscount = Math.min(billDiscount, subtotalAmount);
  const gst = useMemo(
    () =>
      billGstBreakdown(
        lines.map((line) => ({
          subtotal: line.subtotal,
          gstPercent: line.product.gstPercent ?? 0,
        })),
        appliedBillDiscount,
      ),
    [lines, appliedBillDiscount],
  );
  const totalAmount = gst.total;

  function completePay(withPrint: boolean) {
    if (!lines.length || paying) return;
    setPaying(true);
    setTimeout(() => {
      setPaying(false);
      setPaySuccess(true);
      clearCart();
      setBillDiscountText('');
      showToast({
        message: withPrint
          ? `Bill saved · printing · ${formatInr(totalAmount)}`
          : `Bill saved · ${formatInr(totalAmount)}`,
        tone: 'success',
      });
      setTimeout(() => setPaySuccess(false), 1600);
    }, 650);
  }

  function onPay() {
    if (!lines.length || paying) return;
    Alert.alert('Add bill', 'How would you like to save this bill?', [
      {
        text: 'Add after printing',
        onPress: () => completePay(true),
      },
      {
        text: 'Add without printing',
        onPress: () => completePay(false),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  if (pane === 'history') {
    return (
      <>
        <StatusBar style="dark" />
        <BillHistory onChangePane={selectPane} />
      </>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <PressableScale onPress={() => router.back()} hitSlop={10} style={styles.headerSide} scaleTo={0.9}>
          <Ionicons name="arrow-back" size={22} color={theme.purpleDark} />
        </PressableScale>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>New Bill</Text>
          <PressableScale
            style={styles.storeRow}
            scaleTo={0.98}
            hapticOnPress="selection"
            onPress={() => setStoreOpen(true)}
          >
            <Text style={styles.storeName}>{storeName}</Text>
            <Ionicons name="chevron-down" size={14} color={theme.purple} />
          </PressableScale>
        </View>
        <View style={styles.headerRight}>
          <PressableScale onPress={clearCart} style={styles.clearBtn} scaleTo={0.92} hapticOnPress="warning">
            <Ionicons name="bag-handle" size={18} color={theme.purple} />
            <Text style={styles.clearLabel}>Clear</Text>
          </PressableScale>
          <AnimatedNavMenu
            options={PANE_TABS}
            value="new"
            onChange={selectPane}
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
          placeholder="Search products"
          placeholderTextColor={theme.textPlaceholder}
          style={styles.searchInput}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
        />
      </View>

      <View style={styles.split}>
        <View style={styles.leftPane}>
          <View style={styles.paneHeader}>
            <Text style={styles.paneTitle}>All Products</Text>
            <Ionicons name="options-outline" size={18} color={theme.purple} />
          </View>

          {catalog.length === 0 ? (
            <EmptyState
              icon="cube-outline"
              title="No products yet"
              body="Load samples or add products to start billing fast."
              ctaLabel="Load sample products"
              ctaIcon="download-outline"
              onCta={seedSampleProducts}
            />
          ) : (
            <FlatList
              data={catalog}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.catalogList}
              renderItem={({ item, index }) => {
                const unitPrice = productUnitPrice(item);
                return (
                  <ListItemEnter index={index}>
                    <PressableScale
                      style={styles.productCard}
                      onPress={() => addToCart(item.id)}
                      scaleTo={0.97}
                      hapticOnPress="selection"
                    >
                      <View style={styles.thumb}>
                        <Text style={styles.emoji}>{item.emoji}</Text>
                      </View>
                      <View style={styles.productCopy}>
                        <Text style={styles.productName} numberOfLines={2}>
                          {item.name}
                        </Text>
                        <Text style={styles.productPrice}>{formatInr(unitPrice)}</Text>
                        {item.discountPercent > 0 ? (
                          <Text style={styles.productDiscount}>{item.discountPercent}% off</Text>
                        ) : null}
                      </View>
                      <View style={styles.addCircle}>
                        <Ionicons name="add" size={16} color={theme.white} />
                      </View>
                    </PressableScale>
                  </ListItemEnter>
                );
              }}
            />
          )}
        </View>

        <View style={styles.rightPane}>
          <Text style={styles.paneTitle}>
            Current Bill{totalItems ? ` (${totalItems})` : ''}
          </Text>

          {lines.length === 0 ? (
            <Animated.View entering={FadeIn.duration(200)} style={styles.billEmpty}>
              <Ionicons name="bag-handle-outline" size={40} color={theme.purpleBorder} />
              <Text style={styles.billEmptyTitle}>No items added</Text>
              <Text style={styles.billEmptyBody}>Tap on a product to add it to the bill</Text>
            </Animated.View>
          ) : (
            <Animated.ScrollView style={styles.billList} showsVerticalScrollIndicator={false}>
              {lines.map((line) => (
                <Animated.View
                  key={line.productId}
                  entering={FadeIn.duration(160)}
                  layout={LinearTransition.duration(180)}
                  style={styles.billRow}
                >
                  <View style={styles.thumbSm}>
                    <Text style={styles.emojiSm}>{line.product.emoji}</Text>
                  </View>
                  <View style={styles.billMain}>
                    <View style={styles.billTop}>
                      <Text style={styles.billName} numberOfLines={1}>
                        {line.product.name}
                      </Text>
                      <PressableScale
                        onPress={() => removeFromCart(line.productId)}
                        scaleTo={0.88}
                        hapticOnPress="warning"
                        hitSlop={8}
                      >
                        <Ionicons name="trash-outline" size={14} color={theme.danger} />
                      </PressableScale>
                    </View>
                    <Text style={styles.billUnit}>
                      {formatInr(line.unitPrice)}
                      {line.product.discountPercent > 0
                        ? ` · ${line.product.discountPercent}% off`
                        : ''}
                      {line.product.gstPercent > 0
                        ? ` · GST ${line.product.gstPercent}%`
                        : ''}
                      {' / pc'}
                    </Text>
                    <Text style={styles.lineTotal}>{formatInr(line.subtotal)}</Text>
                    <View style={styles.qtyRow}>
                      <PressableScale
                        style={styles.qtyBtn}
                        onPress={() => updateCartQty(line.productId, line.quantity - 1)}
                        scaleTo={0.88}
                        hapticOnPress="selection"
                      >
                        <Ionicons name="remove" size={14} color={theme.purple} />
                      </PressableScale>
                      <Text style={styles.qtyValue}>{line.quantity}</Text>
                      <PressableScale
                        style={styles.qtyBtn}
                        onPress={() => updateCartQty(line.productId, line.quantity + 1)}
                        scaleTo={0.88}
                        hapticOnPress="selection"
                      >
                        <Ionicons name="add" size={14} color={theme.purple} />
                      </PressableScale>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </Animated.ScrollView>
          )}

          <View style={styles.summary}>
            <SummaryRow label="Total Items" value={String(totalItems)} />
            <SummaryRow label="Total Quantity" value={String(totalQty)} />
            <SummaryRow label="Subtotal" value={formatInr(subtotalAmount)} />
            <View style={styles.discountRow}>
              <Text style={styles.summaryLabel}>Bill discount (₹)</Text>
              <TextInput
                value={billDiscountText}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9.]/g, '');
                  setBillDiscountText(cleaned);
                  setBillDiscount(Number(cleaned) || 0);
                }}
                placeholder="0"
                placeholderTextColor={theme.textPlaceholder}
                keyboardType="decimal-pad"
                style={styles.discountInput}
              />
            </View>
            {appliedBillDiscount > 0 ? (
              <SummaryRow label="Discount" value={`− ${formatInr(appliedBillDiscount)}`} />
            ) : null}
            <SummaryRow label="Taxable" value={formatInr(gst.taxable)} />
            {gst.gstAmount > 0 ? (
              <>
                <SummaryRow label="CGST" value={formatInr(gst.cgst)} />
                <SummaryRow label="SGST" value={formatInr(gst.sgst)} />
              </>
            ) : null}
            <SummaryRow label="Total Amount" value={formatInr(totalAmount)} strong />
          </View>

          <Text style={styles.payLabel}>Payment Mode</Text>
          <PressableScale
            style={styles.paySelect}
            onPress={() => setPaymentOpen(true)}
            scaleTo={0.98}
            hapticOnPress="selection"
          >
            <Text style={styles.payValue}>{paymentMode}</Text>
            <Ionicons name="chevron-down" size={16} color={theme.textSecondary} />
          </PressableScale>

          <PrimaryButton
            label={`Pay ${formatInr(totalAmount)}`}
            onPress={onPay}
            loading={paying}
            success={paySuccess}
            successLabel="Paid"
            disabled={!lines.length}
            style={styles.payBtn}
          />
        </View>
      </View>

      <Modal visible={paymentOpen} transparent animationType="fade" onRequestClose={() => setPaymentOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPaymentOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Text style={styles.menuTitle}>Payment mode</Text>
            {PAYMENT_MODES.map((mode) => {
              const active = paymentMode === mode;
              return (
                <PressableScale
                  key={mode}
                  style={styles.menuRow}
                  scaleTo={0.98}
                  hapticOnPress="selection"
                  onPress={() => {
                    setPaymentMode(mode);
                    setPaymentOpen(false);
                  }}
                >
                  <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>{mode}</Text>
                  {active ? <Ionicons name="checkmark" size={18} color={theme.purple} /> : null}
                </PressableScale>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={storeOpen} transparent animationType="fade" onRequestClose={() => setStoreOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setStoreOpen(false)}>
          <Pressable style={styles.menuCard} onPress={() => {}}>
            <Text style={styles.menuTitle}>Select store</Text>
            {stores.map((store) => {
              const active = store.id === activeStoreId;
              return (
                <PressableScale
                  key={store.id}
                  style={styles.menuRow}
                  scaleTo={0.98}
                  onPress={() => {
                    setActiveStore(store.id);
                    setStoreOpen(false);
                  }}
                >
                  <View style={styles.menuCopy}>
                    <Text style={[styles.menuLabel, active && styles.menuLabelActive]}>
                      {store.name}
                    </Text>
                    {store.location ? (
                      <Text style={styles.menuMeta}>{store.location}</Text>
                    ) : null}
                  </View>
                  {active ? <Ionicons name="checkmark" size={18} color={theme.purple} /> : null}
                </PressableScale>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryStrong]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerSide: {
    width: 84,
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: theme.purpleDark,
    fontSize: 18,
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
  clearBtn: {
    width: 40,
    alignItems: 'center',
  },
  headerRight: {
    width: 84,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
  },
  clearLabel: {
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
    minHeight: 44,
    marginBottom: 10,
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
    paddingVertical: 8,
  },
  split: {
    flex: 1,
    flexDirection: 'row',
    gap: 10,
    paddingBottom: 8,
  },
  leftPane: {
    flex: 1.05,
  },
  rightPane: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 14,
    padding: 10,
    backgroundColor: theme.backgroundMuted,
  },
  paneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  paneTitle: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  catalogList: {
    gap: 8,
    paddingBottom: 12,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 8,
    backgroundColor: theme.white,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 20 },
  productCopy: { flex: 1 },
  productName: {
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  productPrice: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
  productDiscount: {
    marginTop: 1,
    color: theme.success,
    fontSize: 10,
    fontWeight: '700',
  },
  addCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: theme.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  billEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  billEmptyTitle: {
    marginTop: 10,
    color: theme.purpleDark,
    fontSize: 13,
    fontWeight: '700',
  },
  billEmptyBody: {
    marginTop: 4,
    color: theme.textSecondary,
    fontSize: 11,
    textAlign: 'center',
  },
  billList: {
    flex: 1,
    marginBottom: 8,
  },
  billRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: theme.white,
    borderRadius: 10,
    padding: 8,
    marginBottom: 8,
  },
  thumbSm: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiSm: { fontSize: 16 },
  billMain: { flex: 1, minWidth: 0 },
  billTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  billName: {
    flex: 1,
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '700',
  },
  billUnit: {
    color: theme.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  lineTotal: {
    marginTop: 2,
    color: theme.purpleDark,
    fontWeight: '800',
    fontSize: 13,
  },
  qtyRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  qtyBtn: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.purpleBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyValue: {
    minWidth: 22,
    textAlign: 'center',
    fontWeight: '700',
    color: theme.purpleDark,
    fontSize: 12,
  },
  summary: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.border,
    paddingTop: 8,
    gap: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  discountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  discountInput: {
    minWidth: 72,
    maxWidth: 96,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    textAlign: 'right',
    color: theme.purpleDark,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: theme.white,
  },
  summaryLabel: {
    color: theme.textSecondary,
    fontSize: 11,
  },
  summaryValue: {
    color: theme.purpleDark,
    fontSize: 11,
    fontWeight: '600',
  },
  summaryStrong: {
    color: theme.purple,
    fontSize: 13,
    fontWeight: '800',
  },
  payLabel: {
    marginTop: 10,
    marginBottom: 6,
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  paySelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    minHeight: 40,
    backgroundColor: theme.white,
    marginBottom: 10,
  },
  payValue: {
    color: theme.purpleDark,
    fontWeight: '600',
    fontSize: 13,
  },
  payBtn: {
    minHeight: 46,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(30,22,48,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  menuCard: {
    backgroundColor: theme.white,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.border,
  },
  menuTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  menuCopy: {
    flex: 1,
    minWidth: 0,
  },
  menuLabel: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '600',
  },
  menuLabelActive: {
    color: theme.purple,
    fontWeight: '700',
  },
  menuMeta: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 11,
  },
});
