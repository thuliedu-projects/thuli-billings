import { supabase } from './supabase';

export type PlatformAccess = 'loading' | 'yes' | 'no' | 'missing';

export type AdminPlan = {
  id: string;
  code: string;
  name: string;
  pricePaise: number;
  blurb: string;
  recommended: boolean;
  isActive: boolean;
  maxStores: number;
  maxStaff: number;
  maxProducts: number | null;
  analytics: boolean;
  invoices: boolean;
  prioritySupport: boolean;
};

export type PlanDraft = {
  id: string;
  code: string;
  name: string;
  priceInr: string;
  blurb: string;
  recommended: boolean;
  isActive: boolean;
  maxStores: string;
  maxStaff: string;
  maxProducts: string;
  analytics: boolean;
  invoices: boolean;
  prioritySupport: boolean;
};

export type PlanMix = {
  code: string;
  name: string;
  payingCount: number;
};

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string | null;
  closedAt: string | null;
  planCode: string | null;
  planName: string | null;
  status: string | null;
  periodEnd: string | null;
  storeCount: number;
  paidSales: number;
  createdAt: string;
};

export type RecentPayment = {
  id: string;
  amountPaise: number | null;
  phone: string | null;
  planCode: string | null;
  createdAt: string;
};

export type PlatformSnapshot = {
  organizationCount: number;
  payingCount: number;
  mrrPaise: number;
  collectedPaise30d: number;
  paidBillCount30d: number;
  paidBillTotal: number;
  planMix: PlanMix[];
  customers: AdminCustomer[];
  recentPayments: RecentPayment[];
};

type EntitlementRow = {
  max_stores: number;
  max_staff: number;
  max_products: number | null;
  analytics: boolean;
  invoices: boolean;
  priority_support: boolean;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value);
  return 0;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length ? value : null;
}

export function draftFromPlan(plan: AdminPlan): PlanDraft {
  return {
    id: plan.id,
    code: plan.code,
    name: plan.name,
    priceInr: String(plan.pricePaise / 100),
    blurb: plan.blurb,
    recommended: plan.recommended,
    isActive: plan.isActive,
    maxStores: String(plan.maxStores),
    maxStaff: String(plan.maxStaff),
    maxProducts: plan.maxProducts == null ? '' : String(plan.maxProducts),
    analytics: plan.analytics,
    invoices: plan.invoices,
    prioritySupport: plan.prioritySupport,
  };
}

export async function fetchPlatformAccess(): Promise<Exclude<PlatformAccess, 'loading'>> {
  if (!supabase) return 'missing';
  const { data, error } = await supabase.rpc('am_platform_admin');
  if (error) {
    if (error.code === 'PGRST202' || error.message.includes('am_platform_admin')) return 'missing';
    return 'no';
  }
  return data === true ? 'yes' : 'no';
}

export async function signInWithGoogle(): Promise<void> {
  if (!supabase) throw new Error('Supabase is not connected.');
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/admin` },
  });
  if (error) throw new Error(error.message);
}

export async function loadAdminPlans(): Promise<AdminPlan[]> {
  if (!supabase) throw new Error('Supabase is not connected.');
  const { data, error } = await supabase
    .from('plans')
    .select(
      `
      id, code, name, price_paise, blurb, recommended, is_active, sort_order,
      plan_entitlements ( max_stores, max_staff, max_products, analytics, invoices, priority_support )
    `,
    )
    .order('sort_order');
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const entitlements = one(row.plan_entitlements as EntitlementRow | EntitlementRow[] | null);
    return {
      id: row.id as string,
      code: row.code as string,
      name: row.name as string,
      pricePaise: row.price_paise as number,
      blurb: (row.blurb as string) ?? '',
      recommended: Boolean(row.recommended),
      isActive: Boolean(row.is_active),
      maxStores: entitlements?.max_stores ?? 1,
      maxStaff: entitlements?.max_staff ?? 1,
      maxProducts: entitlements?.max_products ?? null,
      analytics: Boolean(entitlements?.analytics),
      invoices: Boolean(entitlements?.invoices),
      prioritySupport: Boolean(entitlements?.priority_support),
    };
  });
}

export async function saveAdminPlan(draft: PlanDraft): Promise<void> {
  if (!supabase) throw new Error('Supabase is not connected.');
  const name = draft.name.trim();
  const pricePaise = Math.round(Number(draft.priceInr) * 100);
  const maxStores = Number(draft.maxStores);
  const maxStaff = Number(draft.maxStaff);
  const productsRaw = draft.maxProducts.trim();
  const maxProducts = productsRaw.length ? Number(productsRaw) : null;

  if (!name) throw new Error('Enter a plan name.');
  if (!Number.isFinite(pricePaise) || pricePaise < 100) throw new Error('Price must be at least ₹1.');
  if (!Number.isInteger(maxStores) || maxStores < 1) throw new Error('Stores must be at least 1.');
  if (!Number.isInteger(maxStaff) || maxStaff < 1) throw new Error('Staff seats must be at least 1.');
  if (maxProducts != null && (!Number.isInteger(maxProducts) || maxProducts < 1)) {
    throw new Error('Products must be at least 1, or left empty for unlimited.');
  }

  if (draft.recommended) {
    const { error } = await supabase.from('plans').update({ recommended: false }).eq('recommended', true).neq('id', draft.id);
    if (error) throw new Error(planErrorMessage(error.message));
  }

  const { error: planError } = await supabase
    .from('plans')
    .update({
      name,
      price_paise: pricePaise,
      blurb: draft.blurb.trim(),
      recommended: draft.recommended,
      is_active: draft.isActive,
    })
    .eq('id', draft.id);
  if (planError) throw new Error(planErrorMessage(planError.message));

  const { error: entitlementError } = await supabase
    .from('plan_entitlements')
    .update({
      max_stores: maxStores,
      max_staff: maxStaff,
      max_products: maxProducts,
      analytics: draft.analytics,
      invoices: draft.invoices,
      priority_support: draft.prioritySupport,
    })
    .eq('plan_id', draft.id);
  if (entitlementError) throw new Error(planErrorMessage(entitlementError.message));
}

export async function loadPlatformSnapshot(): Promise<PlatformSnapshot> {
  if (!supabase) throw new Error('Supabase is not connected.');
  const { data, error } = await supabase.rpc('platform_snapshot');
  if (error) throw new Error(error.message.includes('forbidden') ? 'This account cannot view analytics.' : error.message);
  const row = (data ?? {}) as Record<string, unknown>;
  const mix = Array.isArray(row.plan_mix) ? row.plan_mix : [];
  const customers = Array.isArray(row.customers) ? row.customers : [];
  const payments = Array.isArray(row.recent_payments) ? row.recent_payments : [];

  return {
    organizationCount: asNumber(row.organization_count),
    payingCount: asNumber(row.paying_count),
    mrrPaise: asNumber(row.mrr_paise),
    collectedPaise30d: asNumber(row.collected_paise_30d),
    paidBillCount30d: asNumber(row.paid_bill_count_30d),
    paidBillTotal: asNumber(row.paid_bill_total),
    planMix: mix.map((item) => {
      const plan = item as Record<string, unknown>;
      return {
        code: asString(plan.code) ?? '',
        name: asString(plan.name) ?? '',
        payingCount: asNumber(plan.paying_count),
      };
    }),
    customers: customers.map((item) => {
      const customer = item as Record<string, unknown>;
      return {
        id: asString(customer.id) ?? '',
        name: asString(customer.name) ?? 'Untitled',
        phone: asString(customer.phone),
        closedAt: asString(customer.closed_at),
        planCode: asString(customer.plan_code),
        planName: asString(customer.plan_name),
        status: asString(customer.status),
        periodEnd: asString(customer.period_end),
        storeCount: asNumber(customer.store_count),
        paidSales: asNumber(customer.paid_sales),
        createdAt: asString(customer.created_at) ?? '',
      };
    }),
    recentPayments: payments.map((item) => {
      const payment = item as Record<string, unknown>;
      return {
        id: asString(payment.id) ?? '',
        amountPaise: payment.amount_paise == null ? null : asNumber(payment.amount_paise),
        phone: asString(payment.phone),
        planCode: asString(payment.plan_code),
        createdAt: asString(payment.created_at) ?? '',
      };
    }),
  };
}

function planErrorMessage(message: string): string {
  if (message.includes('row-level security') || message.includes('forbidden')) {
    return 'Only an allowlisted Google account can change plans.';
  }
  if (message.includes('plan code') || message.includes('interval')) return 'Plan code and billing interval stay fixed.';
  if (message.includes('plans_one_recommended')) return 'Only one plan can be recommended.';
  return message;
}
