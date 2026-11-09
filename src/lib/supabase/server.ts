import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Admin / Service Role Client (untyped - for server-side write operations)
 *
 * Sengaja tidak menggunakan <Database> generic karena:
 * - Supabase SDK sangat strict pada Update type (harus match exact schema)
 * - Untuk server-side write operations, kita handle type safety di level aplikasi
 * - Browser client (client.ts) tetap menggunakan <Database> untuk read safety
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAdminClient(): ReturnType<typeof createSupabaseClient<any>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    '';

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
