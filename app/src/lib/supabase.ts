/**
 * Supabase client — Auth (Google OAuth) + remote data.
 * Session persists in AsyncStorage; detectSessionInUrl is off (native deep links).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/** Web server render has no window. Native builds keep using AsyncStorage. */
const canUseStorage = process.env.EXPO_OS !== 'web' || typeof window !== 'undefined';

const authStorage = {
  getItem: (key: string) => (canUseStorage ? AsyncStorage.getItem(key) : Promise.resolve(null)),
  setItem: (key: string, value: string) =>
    canUseStorage ? AsyncStorage.setItem(key, value) : Promise.resolve(),
  removeItem: (key: string) => (canUseStorage ? AsyncStorage.removeItem(key) : Promise.resolve()),
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        autoRefreshToken: canUseStorage,
        persistSession: canUseStorage,
        detectSessionInUrl: false,
      },
    })
  : null;
