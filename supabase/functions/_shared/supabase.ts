import { createClient, type SupabaseClient, type User } from "npm:@supabase/supabase-js@2";

import { json } from "./cors.ts";

function firstKey(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (trimmed.startsWith("eyJ") || trimmed.startsWith("sb_")) return trimmed;
  try {
    const parsed = JSON.parse(trimmed) as Record<string, string>;
    const value = parsed.default ?? Object.values(parsed)[0];
    if (!value) return "";
    if (value.startsWith("eyJ") || value.startsWith("sb_")) return value;
    return Deno.env.get(value) ?? "";
  } catch {
    return "";
  }
}

export function supabaseUrl(): string {
  return Deno.env.get("SUPABASE_URL") ?? "";
}

export function publishableKey(): string {
  return (
    firstKey(Deno.env.get("SUPABASE_ANON_KEY")) ||
    firstKey(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS"))
  );
}

export function serviceKey(): string {
  return (
    firstKey(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ||
    firstKey(Deno.env.get("SUPABASE_SECRET_KEYS"))
  );
}

export function adminClient(): SupabaseClient {
  const url = supabaseUrl();
  const key = serviceKey();
  if (!url || !key) {
    throw new Error("Supabase service role is not configured");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function requireUser(req: Request): Promise<{ user: User } | { error: Response }> {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) {
    return { error: json(401, { error: "Sign in again before paying." }) };
  }

  const url = supabaseUrl();
  const key = publishableKey();
  if (!url || !key) {
    return { error: json(500, { error: "Sign-in is not configured." }) };
  }

  const client = createClient(url, key, {
    global: { headers: { Authorization: header } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = header.slice("Bearer ".length);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return { error: json(401, { error: "Sign in again before paying." }) };
  }
  return { user: data.user };
}
