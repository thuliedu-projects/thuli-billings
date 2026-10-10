export type PlanCode = 'starter' | 'growth' | 'pro';

export type Plan = {
  code: PlanCode;
  name: string;
  priceInr: number;
  interval: 'month';
  blurb: string;
  recommended?: boolean;
  entitlements: {
    maxStores: number;
    maxStaff: number;
    maxProducts: number | null;
    analytics: boolean;
    invoices: boolean;
    prioritySupport: boolean;
  };
};

/** Placeholder INR prices — swap when real price_paise lands in Supabase. */
export const PLANS: Plan[] = [
  {
    code: 'starter',
    name: 'Starter',
    priceInr: 499,
    interval: 'month',
    blurb: 'Good for a single counter getting started',
    entitlements: {
      maxStores: 1,
      maxStaff: 2,
      maxProducts: 50,
      analytics: false,
      invoices: false,
      prioritySupport: false,
    },
  },
  {
    code: 'growth',
    name: 'Growth',
    priceInr: 999,
    interval: 'month',
    recommended: true,
    blurb: 'Everything you need for a growing store',
    entitlements: {
      maxStores: 3,
      maxStaff: 10,
      maxProducts: 200,
      analytics: true,
      invoices: true,
      prioritySupport: false,
    },
  },
  {
    code: 'pro',
    name: 'Pro',
    priceInr: 1999,
    interval: 'month',
    blurb: 'Advanced features for scaling your business',
    entitlements: {
      maxStores: 10,
      maxStaff: 50,
      maxProducts: null,
      analytics: true,
      invoices: true,
      prioritySupport: true,
    },
  },
];

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}
