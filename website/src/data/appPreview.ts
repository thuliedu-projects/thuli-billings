/** Sample catalog mirrored from app/src/features/demo/data.ts for the marketing preview. */

export type PreviewProduct = {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  unit: string;
};

export type PreviewBill = {
  id: string;
  number: string;
  amount: number;
  customer: string;
  paymentMode: string;
  billedAt: string;
};

export const STORE_NAME = 'THULI Demo Store';

export const TODAY_STATS = {
  sales: 2450,
  bills: 3,
} as const;

export const WEEK_SALES = [820, 980, 1680, 1840, 2280, 2150, 2700];

export const PRODUCTS: PreviewProduct[] = [
  { id: '1', name: 'Coca Cola 250ml', category: 'Beverages', price: 30, stock: 50, unit: 'Nos' },
  { id: '2', name: 'Lays Classic 52g', category: 'Snacks', price: 20, stock: 35, unit: 'Nos' },
  { id: '3', name: 'Amul Taaza Milk 1L', category: 'Dairy', price: 68, stock: 40, unit: 'L' },
  { id: '4', name: 'Dove Soap 100g', category: 'Personal Care', price: 55, stock: 30, unit: 'Nos' },
  { id: '5', name: 'Maggi 2-Min 70g', category: 'Groceries', price: 14, stock: 8, unit: 'Nos' },
  { id: '6', name: 'Parle-G 800g', category: 'Snacks', price: 70, stock: 3, unit: 'Nos' },
];

export const BILLS: PreviewBill[] = [
  {
    id: 'b25',
    number: 'INV-00025',
    amount: 1250,
    customer: 'Walk-in',
    paymentMode: 'UPI',
    billedAt: 'Today, 10:30 AM',
  },
  {
    id: 'b24',
    number: 'INV-00024',
    amount: 750,
    customer: 'Walk-in',
    paymentMode: 'Cash',
    billedAt: 'Today, 09:15 AM',
  },
  {
    id: 'b23',
    number: 'INV-00023',
    amount: 450,
    customer: 'Walk-in',
    paymentMode: 'UPI',
    billedAt: 'Yesterday, 6:45 PM',
  },
];

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function stockTone(stock: number): 'in' | 'low' | 'out' {
  if (stock <= 0) return 'out';
  if (stock <= 10) return 'low';
  return 'in';
}
