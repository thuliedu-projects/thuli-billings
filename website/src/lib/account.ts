import { supabase } from './supabase';

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
};

export type AccountSnapshot = {
  orgs: AccountOrg[];
  payments: PaymentRow[];
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

export function subscriptionIsActive(subscription: AccountSubscription | null, now = Date.now()): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active' && subscription.status !== 'trialing') return false;
  if (!subscription.currentPeriodEnd) return true;
  return new Date(subscription.currentPeriodEnd).getTime() > now;
}

export async function loadAccount(userId: string): Promise<AccountSnapshot> {
  if (!supabase) return { orgs: [], payments: [] };

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

  const orgIds = orgs.map((org) => org.id);
  if (orgIds.length === 0) return { orgs, payments: [] };

  const { data: events, error: eventsError } = await supabase
    .from('payment_events')
    .select('id, event_type, amount_paise, status, created_at')
    .in('org_id', orgIds)
    .order('created_at', { ascending: false });

  if (eventsError) throw new Error(eventsError.message);

  const payments: PaymentRow[] = (events ?? []).map((event) => ({
    id: event.id as string,
    eventType: event.event_type as string,
    amountPaise: (event.amount_paise as number | null) ?? null,
    status: (event.status as string | null) ?? null,
    createdAt: event.created_at as string,
  }));

  return { orgs, payments };
}
