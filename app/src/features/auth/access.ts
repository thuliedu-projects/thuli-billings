import type { Href } from 'expo-router';

import { supabase } from '@/lib/supabase';

export const paymentRequiredRoute = '/(auth)/payment-required' as Href;

export type Access =
  | { state: 'signed_out' }
  | { state: 'paid' }
  | { state: 'unpaid' }
  | { state: 'error'; message: string };

type SubRow = {
  status: string;
  current_period_end: string | null;
};

type OrgRow = {
  closed_at: string | null;
  subscriptions: SubRow | SubRow[] | null;
};

type MemberRow = {
  organizations: OrgRow | OrgRow[] | null;
};

function list<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function memberIsPaid(rows: MemberRow[], now = Date.now()): boolean {
  for (const row of rows) {
    for (const org of list(row.organizations)) {
      if (org.closed_at) continue;
      for (const sub of list(org.subscriptions)) {
        if (sub.status !== 'active' && sub.status !== 'trialing') continue;
        if (!sub.current_period_end || new Date(sub.current_period_end).getTime() > now) {
          return true;
        }
      }
    }
  }
  return false;
}

/** Signed-in users reach the app only with an active organization subscription. */
export async function loadAccess(): Promise<Access> {
  if (!supabase) return { state: 'signed_out' };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    return { state: 'error', message: 'Could not check your plan. Try again.' };
  }
  const userId = sessionData.session?.user.id;
  if (!userId) return { state: 'signed_out' };

  const { data, error } = await supabase
    .from('organization_members')
    .select('organizations(closed_at, subscriptions(status, current_period_end))')
    .eq('user_id', userId);

  if (error) {
    return { state: 'error', message: 'Could not check your plan. Try again.' };
  }

  if (memberIsPaid((data ?? []) as MemberRow[])) return { state: 'paid' };
  return { state: 'unpaid' };
}
