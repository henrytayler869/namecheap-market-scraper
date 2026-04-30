/**
 * Supabase server-side client.
 * Uses SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service_role bypasses RLS).
 * Only import from API routes (server-only) — never from client components.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

let _client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (_client) return _client;
  if (!URL || !KEY) {
    throw new Error(
      "Supabase chưa được cấu hình. Set SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY trong dashboard/.env.local"
    );
  }
  _client = createClient(URL, KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _client;
}
