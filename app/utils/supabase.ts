import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

// Browser-side Supabase client using the anon key. Subject to RLS.
export function useSupabase(): SupabaseClient {
  if (cached) return cached
  const { public: pub } = useRuntimeConfig()
  cached = createClient(pub.supabaseUrl as string, pub.supabaseAnonKey as string)
  return cached
}
