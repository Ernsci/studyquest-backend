import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, isSupabaseConfigured } from "../../config/env";



let adminClient: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured() || env.supabaseSecretKey.length === 0) return null;
  adminClient ??= createClient(env.supabaseUrl, env.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return adminClient;
}

function supabasePublic(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  return createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type VerifiedUser = { id: string; email: string | null };

export async function verifyAccessToken(token: string): Promise<VerifiedUser | null> {
  const client = supabaseAdmin() ?? supabasePublic();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null };
  } catch {
    return null;
  }
}
