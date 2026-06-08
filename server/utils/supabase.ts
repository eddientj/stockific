import { createClient } from '@supabase/supabase-js'

// Server-side client using the service role key — bypasses RLS.
// Never expose to the browser. Re-created per request so hot-reload
// always picks up the latest env values.
export function useSupabaseAdmin() {
  const { supabaseUrl, supabaseServiceKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabaseServiceKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars',
    })
  }
  return createClient(supabaseUrl as string, supabaseServiceKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
