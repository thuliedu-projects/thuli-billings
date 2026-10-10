import { supabase } from '@/lib/supabase';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getSession() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/** Remote store delete when signed in. Demo ids that are not UUIDs are skipped. */
export async function deleteRemoteStore(storeId: string) {
  const session = await getSession();
  if (!session || !supabase || !UUID_RE.test(storeId)) return;

  const { error } = await supabase.from('stores').delete().eq('id', storeId);
  if (error) throw error;
}

/** Closes owned orgs on Supabase and signs out. Bills stay. No-op when there is no session. */
export async function deleteRemoteAccount() {
  const session = await getSession();
  if (!session || !supabase) return;

  const { error } = await supabase.rpc('delete_own_account');
  if (error) throw error;
  await supabase.auth.signOut();
}
