import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase Browser Client
 * Digunakan di Client Component untuk realtime subscriptions dan query client-side
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createClient(): ReturnType<typeof createBrowserClient<any>> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
