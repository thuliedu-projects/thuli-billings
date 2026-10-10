export type DemoStore = {
  id: string;
  name: string;
  location: string;
  phone: string;
  address: string;
  gstin: string;
  /** Local image URI from the device picker; empty when unset. */
  logoUri: string;
};

export type DemoProduct = {
  id: string;
  storeId: string;
  name: string;
  category: string;
  sellingPrice: number;
  costPrice: number;
  /** Percent off selling price (0–100). */
  discountPercent: number;
  /**
   * GST slab for this product (owner-set). Not store-wide —
   * Indian GST varies by item (commonly 0 / 5 / 12 / 18 / 28).
   * Selling price is treated as tax-exclusive.
   */
  gstPercent: number;
  stock: number;
  unit: string;
  emoji: string;
};

export type CartLine = {
  productId: string;
  quantity: number;
};

export const SAMPLE_STORE_ID = 'store-1';

export const SAMPLE_STORES: DemoStore[] = [
  {
    id: SAMPLE_STORE_ID,
    name: 'Sri Lakshmi Stores',
    location: 'Chennai, Tamil Nadu',
    phone: '+91 81228 97170',
    address: 'T. Nagar, Chennai',
    gstin: '',
    logoUri: '',
  },
];

/** @deprecated use SAMPLE_STORES[0] — kept for older imports */
export const SAMPLE_STORE = SAMPLE_STORES[0];

export const SAMPLE_CATEGORIES = [
  'Beverages',
  'Snacks',
  'Dairy',
  'Personal Care',
  'Household',
  'Food',
] as const;

export const SAMPLE_PRODUCTS: DemoProduct[] = [
  {
    id: '1',
    storeId: SAMPLE_STORE_ID,
    name: 'Coca Cola 250ml',
    category: 'Beverages',
    sellingPrice: 30,
    costPrice: 22,
    discountPercent: 0,
    gstPercent: 28,
    stock: 50,
    unit: 'Nos',
    emoji: '🥤',
  },
  {
    id: '2',
    storeId: SAMPLE_STORE_ID,
    name: 'Lays Classic 52g',
    category: 'Snacks',
    sellingPrice: 20,
    costPrice: 14,
    discountPercent: 5,
    gstPercent: 12,
    stock: 35,
    unit: 'Nos',
    emoji: '🥔',
  },
  {
    id: '3',
    storeId: SAMPLE_STORE_ID,
    name: 'Amul Taaza Milk 1L',
    category: 'Dairy',
    sellingPrice: 68,
    costPrice: 60,
    discountPercent: 0,
    gstPercent: 5,
    stock: 40,
    unit: 'L',
    emoji: '🥛',
  },
  {
    id: '4',
    storeId: SAMPLE_STORE_ID,
    name: 'Dove Soap 100g',
    category: 'Personal Care',
    sellingPrice: 55,
    costPrice: 42,
    discountPercent: 10,
    gstPercent: 18,
    stock: 30,
    unit: 'Nos',
    emoji: '🧼',
  },
  {
    id: '5',
    storeId: SAMPLE_STORE_ID,
    name: 'Parle-G Biscuit 100g',
    category: 'Snacks',
    sellingPrice: 10,
    costPrice: 7,
    discountPercent: 0,
    gstPercent: 5,
    stock: 8,
    unit: 'Nos',
    emoji: '🍪',
  },
  {
    id: '6',
    storeId: SAMPLE_STORE_ID,
    name: 'Tide Plus Detergent 1kg',
    category: 'Household',
    sellingPrice: 145,
    costPrice: 120,
    discountPercent: 0,
    gstPercent: 18,
    stock: 25,
    unit: 'Kg',
    emoji: '🧴',
  },
  {
    id: '7',
    storeId: SAMPLE_STORE_ID,
    name: 'Surf Excel Quick Wash 1kg',
    category: 'Household',
    sellingPrice: 160,
    costPrice: 135,
    discountPercent: 0,
    gstPercent: 18,
    stock: 0,
    unit: 'Kg',
    emoji: '🫧',
  },
  {
    id: '8',
    storeId: SAMPLE_STORE_ID,
    name: 'Maggi Noodles 70g',
    category: 'Food',
    sellingPrice: 14,
    costPrice: 10,
    discountPercent: 0,
    gstPercent: 18,
    stock: 60,
    unit: 'Nos',
    emoji: '🍜',
  },
];

export type DemoBill = {
  id: string;
  number: string;
  amount: number;
  status: 'paid' | 'pending';
  billedAt: string;
  billedAtIso: string;
  customer: string;
  itemCount: number;
  paymentMode: 'Cash' | 'UPI';
};

export type SalesPoint = {
  label: string;
  value: number;
};

export const SAMPLE_TODAY_STATS = {
  sales: 2450,
  bills: 3,
  orders: 3,
  pending: 0,
} as const;

export const SAMPLE_WEEK_SALES: SalesPoint[] = [
  { label: '25 May', value: 820 },
  { label: '26 May', value: 980 },
  { label: '27 May', value: 1680 },
  { label: '28 May', value: 1840 },
  { label: '29 May', value: 2280 },
  { label: '30 May', value: 2150 },
  { label: '31 May', value: 2700 },
];

export const SAMPLE_MONTH_SALES: SalesPoint[] = [
  { label: 'W1', value: 7200 },
  { label: 'W2', value: 8100 },
  { label: 'W3', value: 12450 },
  { label: 'W4', value: 9800 },
];

export const SAMPLE_BILL_HISTORY: DemoBill[] = [
  {
    id: 'bill-12',
    number: 'BILL00012',
    amount: 178,
    status: 'paid',
    billedAt: '17 Sep 2026, 04:32 PM',
    billedAtIso: '2026-09-17T16:32:00',
    customer: 'Ramesh Kumar',
    itemCount: 3,
    paymentMode: 'Cash',
  },
  {
    id: 'bill-11',
    number: 'BILL00011',
    amount: 96.5,
    status: 'paid',
    billedAt: '16 Sep 2026, 01:15 PM',
    billedAtIso: '2026-09-16T13:15:00',
    customer: 'Priya Sharma',
    itemCount: 2,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-10',
    number: 'BILL00010',
    amount: 245,
    status: 'pending',
    billedAt: '14 Sep 2026, 06:20 PM',
    billedAtIso: '2026-09-14T18:20:00',
    customer: 'Suresh Patel',
    itemCount: 5,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-09',
    number: 'BILL00009',
    amount: 65,
    status: 'paid',
    billedAt: '12 Sep 2026, 12:47 PM',
    billedAtIso: '2026-09-12T12:47:00',
    customer: 'Neha Verma',
    itemCount: 1,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-08',
    number: 'BILL00008',
    amount: 320,
    status: 'paid',
    billedAt: '05 Sep 2026, 05:10 PM',
    billedAtIso: '2026-09-05T17:10:00',
    customer: 'Amit Singh',
    itemCount: 4,
    paymentMode: 'Cash',
  },
  {
    id: 'bill-07',
    number: 'BILL00007',
    amount: 120,
    status: 'pending',
    billedAt: '02 Sep 2026, 03:25 PM',
    billedAtIso: '2026-09-02T15:25:00',
    customer: 'Sneha Iyer',
    itemCount: 2,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-06',
    number: 'BILL00006',
    amount: 410.5,
    status: 'paid',
    billedAt: '28 Aug 2026, 11:12 AM',
    billedAtIso: '2026-08-28T11:12:00',
    customer: 'Vikram Rao',
    itemCount: 6,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-05',
    number: 'BILL00005',
    amount: 88,
    status: 'paid',
    billedAt: '22 Aug 2026, 09:40 AM',
    billedAtIso: '2026-08-22T09:40:00',
    customer: 'Ananya Nair',
    itemCount: 2,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-04',
    number: 'BILL00004',
    amount: 156,
    status: 'paid',
    billedAt: '18 Aug 2026, 07:05 PM',
    billedAtIso: '2026-08-18T19:05:00',
    customer: 'Karthik Menon',
    itemCount: 3,
    paymentMode: 'Cash',
  },
  {
    id: 'bill-03',
    number: 'BILL00003',
    amount: 54,
    status: 'pending',
    billedAt: '11 Aug 2026, 02:18 PM',
    billedAtIso: '2026-08-11T14:18:00',
    customer: 'Meera Joshi',
    itemCount: 1,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-02',
    number: 'BILL00002',
    amount: 210,
    status: 'paid',
    billedAt: '04 Jul 2026, 11:50 AM',
    billedAtIso: '2026-07-04T11:50:00',
    customer: 'Rahul Desai',
    itemCount: 4,
    paymentMode: 'UPI',
  },
  {
    id: 'bill-01',
    number: 'BILL00001',
    amount: 99,
    status: 'paid',
    billedAt: '28 Jun 2026, 06:22 PM',
    billedAtIso: '2026-06-28T18:22:00',
    customer: 'Walk-in',
    itemCount: 2,
    paymentMode: 'Cash',
  },
];

export const SAMPLE_RECENT_BILLS: DemoBill[] = [
  {
    id: 'b25',
    number: 'INV-00025',
    amount: 1250,
    status: 'paid',
    billedAt: '31 May 2026, 10:30 AM',
    billedAtIso: '2026-05-31T10:30:00',
    customer: 'Walk-in',
    itemCount: 4,
    paymentMode: 'UPI',
  },
  {
    id: 'b24',
    number: 'INV-00024',
    amount: 750,
    status: 'paid',
    billedAt: '31 May 2026, 09:15 AM',
    billedAtIso: '2026-05-31T09:15:00',
    customer: 'Walk-in',
    itemCount: 2,
    paymentMode: 'Cash',
  },
  {
    id: 'b23',
    number: 'INV-00023',
    amount: 450,
    status: 'paid',
    billedAt: '30 May 2026, 06:45 PM',
    billedAtIso: '2026-05-30T18:45:00',
    customer: 'Walk-in',
    itemCount: 3,
    paymentMode: 'UPI',
  },
];

export function clampDiscountPercent(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/** Clamp to a sensible GST % (owner enters slab; typically 0–28). */
export function clampGstPercent(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

/** Selling price after product discount (tax-exclusive). */
export function productUnitPrice(product: Pick<DemoProduct, 'sellingPrice' | 'discountPercent'>) {
  const discount = clampDiscountPercent(product.discountPercent ?? 0);
  return product.sellingPrice * (1 - discount / 100);
}

export type BillLineForGst = {
  subtotal: number;
  gstPercent: number;
};

export type BillGstBreakdown = {
  taxable: number;
  gstAmount: number;
  cgst: number;
  sgst: number;
  total: number;
};

/**
 * Bill GST after a flat ₹ discount. Discount is split across lines by
 * subtotal share so mixed slabs stay correct. Intra-state split: CGST = SGST = half.
 */
export function billGstBreakdown(
  lines: BillLineForGst[],
  billDiscount = 0,
): BillGstBreakdown {
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const appliedDiscount = Math.min(
    !Number.isFinite(billDiscount) || billDiscount < 0 ? 0 : billDiscount,
    subtotal,
  );

  if (subtotal <= 0) {
    return { taxable: 0, gstAmount: 0, cgst: 0, sgst: 0, total: 0 };
  }

  let taxable = 0;
  let gstAmount = 0;
  for (const line of lines) {
    const share = line.subtotal / subtotal;
    const lineTaxable = Math.max(0, line.subtotal - appliedDiscount * share);
    taxable += lineTaxable;
    gstAmount += lineTaxable * (clampGstPercent(line.gstPercent) / 100);
  }

  const cgst = gstAmount / 2;
  const sgst = gstAmount / 2;
  return {
    taxable,
    gstAmount,
    cgst,
    sgst,
    total: taxable + gstAmount,
  };
}

export function formatInr(amount: number) {
  return `₹${amount.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatStockQty(stock: number, unit: string) {
  const suffix = unit.toLowerCase() === 'nos' ? 'pcs' : unit.toLowerCase();
  return `${stock} ${suffix}`;
}

export function stockStatus(stock: number): 'in' | 'low' | 'out' {
  if (stock <= 0) return 'out';
  if (stock <= 10) return 'low';
  return 'in';
}
