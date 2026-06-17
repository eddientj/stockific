import { createBrowserClient } from '@supabase/ssr'

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const client = createBrowserClient(
    config.public.supabaseUrl as string,
    config.public.supabaseAnonKey as string,
  )
  return { provide: { supabase: client } }
})
