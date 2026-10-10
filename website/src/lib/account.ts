import { PLANS, type Plan } from '../data/plans';
import { supabase } from './supabase';

const GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export type AccountPlan = {
  code: string;
  name: string;
  pricePaise: number;
  interval: string;
};

export type AccountSubscription = {
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  plan: AccountPlan | null;
};

export type AccountOrg = {
  id: string;
  name: string;
  closedAt: string | null;
  role: string;
  subscription: AccountSubscription | null;
};

export type PaymentRow = {
  id: string;
  eventType: string;
  amountPaise: number | null;
  status: string | null;
  createdAt: string;
  planCode: string | null;
  paymentId: string | null;
  orderId: string | null;
};

export type AccountEntitlements = {
  maxStores: number;
  maxStaff: number;
  maxProducts: number | null;
  analytics: boolean;
  invoices: boolean;
  prioritySupport: boolean;
};

export type CatalogPlan = AccountPlan & {
  blurb: string;
  recommended: boolean;
  entitlements: AccountEntitlements;
};

export type AccountStore = {
  id: string;
  orgId: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  isActive: boolean;
  timezone: string;
  createdAt: string;
};

export type StoreInput = {
  name: string;
  phone: string;
  address: string;
  gstin: string;
  isActive: boolean;
};

export type AccountSnapshot = {
  orgs: AccountOrg[];
  payments: PaymentRow[];
  stores: AccountStore[];
  plans: CatalogPlan[];
  staffSeatsByOrg: Record<string, number>;
};

type PlanJoin = {
  code: string;
  name: string;
  price_paise: number;
  interval: string;
};

type SubscriptionJoin = {
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  plans: PlanJoin | PlanJoin[] | null;
};

type OrgJoin = {
  id: string;
  name: string;
  closed_at: string | null;
  subscriptions: SubscriptionJoin | SubscriptionJoin[] | null;
};

type MemberJoin = {
  role: string;
  organizations: OrgJoin | OrgJoin[] | null;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function subscriptionStatusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'trialing') return 'Trial';
  if (status === 'past_due') return 'Past due';
  if (status === 'canceled') return 'Canceled';
  if (status === 'expired') return 'Expired';
  return status;
}

export function subscriptionIsActive(subscription: AccountSubscription | null, now = Date.now()): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;
  if (!subscription.currentPeriodEnd) return true;
  return new Date(subscription.currentPeriodEnd).getTime() > now;
}

const EMPTY_ACCOUNT: AccountSnapshot = {
  orgs: [],
  payments: [],
  stores: [],
  plans: PLANS.map(catalogFromLocal),
  staffSeatsByOrg: {},
};

export async function loadAccount(userId: string): Promise<AccountSnapshot> {
  if (!supabase) return EMPTY_ACCOUNT;

  const plansPromise = loadCatalogPlans();
  const { data, error } = await supabase
    .from('organization_members')
    .select(
      `
      role,
      organizations (
        id,
        name,
        closed_at,
        subscriptions (
          status,
          current_period_start,
          current_period_end,
          plans ( code, name, price_paise, interval )
        )
      )
    `,
    )
    .eq('user_id', userId);

  if (error) throw new Error(error.message);

  const orgs: AccountOrg[] = [];
  for (const row of (data ?? []) as MemberJoin[]) {
    const org = one(row.organizations);
    if (!org) continue;
    const subscription = one(org.subscriptions);
    const plan = subscription ? one(subscription.plans) : null;
    orgs.push({
      id: org.id,
      name: org.name,
      closedAt: org.closed_at,
      role: row.role,
      subscription: subscription
        ? {
            status: subscription.status,
            currentPeriodStart: subscription.current_period_start,
            currentPeriodEnd: subscription.current_period_end,
            plan: plan
              ? {
                  code: plan.code,
                  name: plan.name,
                  pricePaise: plan.price_paise,
                  interval: plan.interval,
                }
              : null,
          }
        : null,
    });
  }

  const plans = await plansPromise;
  const orgIds = orgs.map((org) => org.id);
  if (orgIds.length === 0) return { ...EMPTY_ACCOUNT, orgs, plans };

  const [payments, stores, staffSeatsByOrg] = await Promise.all([
    loadPayments(orgIds),
    loadStores(orgIds),
    loadStaffSeats(orgIds),
  ]);

  return { orgs, payments, stores, plans, staffSeatsByOrg };
}

export function validateStoreInput(input: StoreInput): string | null {
  const name = input.name.trim();
  if (name.length < 2) return 'Give the store a name of at least 2 characters.';
  if (name.length > 80) return 'Store name is too long.';
  if (input.phone.trim().length > 20) return 'Phone number is too long.';
  if (input.address.trim().length > 240) return 'Address is too long.';
  const gstin = input.gstin.trim().toUpperCase();
  if (gstin && !GSTIN.test(gstin)) return 'GSTIN should be 15 characters, like 29ABCDE1234F1Z5.';
  return null;
}

export async function renameOrganization(orgId: string, name: string): Promise<void> {
  if (!supabase) throw new Error('Account is not connected.');
  const trimmed = name.trim();
  if (trimmed.length < 2) throw new Error('Use at least 2 characters for the business name.');
  const { error } = await supabase.from('organizations').update({ name: trimmed }).eq('id', orgId);
  if (error) {
    console.error(error.message);
    throw new Error(
      error.message.includes('row-level security')
        ? 'Only the owner can rename the business.'
        : 'Could not rename the business.',
    );
  }
}

export async function createStore(orgId: string, input: StoreInput): Promise<void> {
  if (!supabase) throw new Error('Account is not connected.');
  const invalid = validateStoreInput(input);
  if (invalid) throw new Error(invalid);
  const { error } = await supabase.from('stores').insert(storeWrite(orgId, input));
  if (error) throw new Error(storeErrorMessage(error.message));
}

export async function updateStore(storeId: string, orgId: string, input: StoreInput): Promise<void> {
  if (!supabase) throw new Error('Account is not connected.');
  const invalid = validateStoreInput(input);
  if (invalid) throw new Error(invalid);
  const { error } = await supabase.from('stores').update(storeFields(input)).eq('id', storeId).eq('org_id', orgId);
  if (error) throw new Error(storeErrorMessage(error.message));
}

function catalogFromLocal(plan: Plan): CatalogPlan {
  return {
    code: plan.code,
    name: plan.name,
    pricePaise: plan.priceInr * 100,
    interval: plan.interval,
    blurb: plan.blurb,
    recommended: Boolean(plan.recommended),
    entitlements: { ...plan.entitlements },
  };
}

function entitlementsFromRow(row: {
  max_stores: number;
  max_staff: number;
  max_products: number | null;
  analytics: boolean;
  invoices: boolean;
  priority_support: boolean;
}): AccountEntitlements {
  return {
    maxStores: row.max_stores,
    maxStaff: row.max_staff,
    maxProducts: row.max_products,
    analytics: row.analytics,
    invoices: row.invoices,
    prioritySupport: row.priority_support,
  };
}

async function loadCatalogPlans(): Promise<CatalogPlan[]> {
  if (!supabase) return PLANS.map(catalogFromLocal);
  const { data, error } = await supabase
    .from('plans')
    .select(
      `
      code, name, price_paise, interval, sort_order, is_active,
      plan_entitlements ( max_stores, max_staff, max_products, analytics, invoices, priority_support )
    `,
    )
    .eq('is_active', true)
    .order('sort_order');

  if (error || !data?.length) return PLANS.map(catalogFromLocal);

  const plans: CatalogPlan[] = [];
  for (const row of data) {
    const local = PLANS.find((plan) => plan.code === row.code);
    const entitlements = one(row.plan_entitlements as EntitlementJoin | EntitlementJoin[] | null);
    plans.push({
      code: row.code as string,
      name: row.name as string,
      pricePaise: row.price_paise as number,
      interval: row.interval as string,
      blurb: local?.blurb ?? '',
      recommended: Boolean(local?.recommended),
      entitlements: entitlements ? entitlementsFromRow(entitlements) : catalogFromLocal(local ?? PLANS[0]).entitlements,
    });
  }
  return plans.length ? plans : PLANS.map(catalogFromLocal);
}

async function loadPayments(orgIds: string[]): Promise<PaymentRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('payment_events')
    .select('id, event_type, amount_paise, status, created_at, payload')
    .in('org_id', orgIds)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((event) => {
    const payload = event.payload as { plan_code?: unknown; payment_id?: unknown; order_id?: unknown } | null;
    return {
      id: event.id as string,
      eventType: event.event_type as string,
      amountPaise: (event.amount_paise as number | null) ?? null,
      status: (event.status as string | null) ?? null,
      createdAt: event.created_at as string,
      planCode: typeof payload?.plan_code === 'string' ? payload.plan_code : null,
      paymentId: typeof payload?.payment_id === 'string' ? payload.payment_id : null,
      orderId: typeof payload?.order_id === 'string' ? payload.order_id : null,
    };
  });
}

async function loadStores(orgIds: string[]): Promise<AccountStore[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('stores')
    .select('id, org_id, name, phone, address, gstin, is_active, timezone, created_at')
    .in('org_id', orgIds)
    .order('created_at');
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    orgId: row.org_id as string,
    name: row.name as string,
    phone: (row.phone as string | null) ?? null,
    address: (row.address as string | null) ?? null,
    gstin: (row.gstin as string | null) ?? null,
    isActive: Boolean(row.is_active),
    timezone: (row.timezone as string) || 'Asia/Kolkata',
    createdAt: row.created_at as string,
  }));
}

async function loadStaffSeats(orgIds: string[]): Promise<Record<string, number>> {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('organization_members')
    .select('org_id, role')
    .in('org_id', orgIds);
  if (error) throw new Error(error.message);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.role === 'owner') continue;
    const orgId = row.org_id as string;
    counts[orgId] = (counts[orgId] ?? 0) + 1;
  }
  return counts;
}

function blank(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function storeFields(input: StoreInput) {
  return {
    name: input.name.trim(),
    phone: blank(input.phone),
    address: blank(input.address),
    gstin: blank(input.gstin)?.toUpperCase() ?? null,
    is_active: input.isActive,
  };
}

function storeWrite(orgId: string, input: StoreInput) {
  return {
    org_id: orgId,
    timezone: 'Asia/Kolkata',
    ...storeFields(input),
  };
}

function storeErrorMessage(message: string): string {
  console.error(message);
  if (message.includes('max_stores')) {
    return 'This plan has no store slots left. Choose a larger plan to add another store.';
  }
  if (message.includes('subscription inactive')) return 'Pay for an active plan before adding a store.';
  if (message.includes('row-level security')) return 'Only the owner or an admin can change stores.';
  return 'Could not save the store.';
}

type EntitlementJoin = {
  max_stores: number;
  max_staff: number;
  max_products: number | null;
  analytics: boolean;
  invoices: boolean;
  priority_support: boolean;
};
