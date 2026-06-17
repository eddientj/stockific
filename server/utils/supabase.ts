import { createClient } from '@supabase/supabase-js'
import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'
import type { H3Event } from 'h3'

export function useSupabaseAdmin() {
  const { supabaseUrl, supabaseServiceKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabaseServiceKey)
    throw createError({ statusCode: 500, statusMessage: 'Missing Supabase env vars' })
  return createClient(supabaseUrl as string, supabaseServiceKey as string, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function useSupabaseAnon(event: H3Event) {
  const config = useRuntimeConfig()
  return createServerClient(
    config.public.supabaseUrl as string,
    config.public.supabaseAnonKey as string,
    {
      cookies: {
        getAll() { return parseCookieHeader(getHeader(event, 'Cookie') ?? '') },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            appendResponseHeader(event, 'Set-Cookie', serializeCookieHeader(name, value, options)))
        },
      },
    },
  )
}

function decodeJwtPayload(token: string): Record<string, any> {
  try { return JSON.parse(atob(token.split('.')[1]!)) } catch { return {} }
}

// Verifies the request has a valid session. Does NOT require an org (use for onboarding).
export async function requireUser(event: H3Event) {
  const client = useSupabaseAnon(event)
  const { data: { user }, error } = await client.auth.getUser()
  if (error || !user) throw createError({ statusCode: 401, statusMessage: 'Unauthorised' })
  const { data: { session } } = await client.auth.getSession()
  if (!session) throw createError({ statusCode: 401, statusMessage: 'No session' })
  return { user, session }
}

// Verifies the request has a valid session AND an org. Use for all tenant-scoped routes.
export async function requireAuth(event: H3Event) {
  const { user, session } = await requireUser(event)
  const payload = decodeJwtPayload(session.access_token)
  const orgId: string | undefined = payload.org_id
  if (!orgId) throw createError({ statusCode: 403, statusMessage: 'No organisation — complete onboarding first' })
  return { user, orgId, orgRole: payload.org_role as string | undefined }
}
