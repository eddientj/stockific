import { createServerClient, parseCookieHeader, serializeCookieHeader } from '@supabase/ssr'

// Handles Supabase auth callbacks server-side so the PKCE code verifier
// (stored as a cookie by the browser client) is readable from request headers.
export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const code  = query.code as string | undefined
  const type  = query.type as string | undefined

  if (!code) return sendRedirect(event, '/login')

  const config = useRuntimeConfig()

  // Mirror the same cookie handling as useSupabaseAnon so the verifier is found
  const supabase = createServerClient(
    config.public.supabaseUrl as string,
    config.public.supabaseAnonKey as string,
    {
      cookies: {
        getAll:  () => parseCookieHeader(getHeader(event, 'Cookie') ?? ''),
        setAll: (cookiesToSet) =>
          cookiesToSet.forEach(({ name, value, options }) =>
            appendResponseHeader(event, 'Set-Cookie', serializeCookieHeader(name, value, options))),
      },
    },
  )

  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data.session) {
    const msg = encodeURIComponent(error?.message ?? 'Authentication failed')
    return sendRedirect(event, `/auth/error?message=${msg}`)
  }

  const { session } = data

  // Password recovery — hand off to the reset page
  if (type === 'recovery') {
    return sendRedirect(event, '/reset-password')
  }

  // Email confirmation: create profile from user_metadata if not yet created
  const meta = session.user.user_metadata
  if (meta?.username) {
    const admin = useSupabaseAdmin()
    await admin.from('profiles').upsert({
      id:         session.user.id,
      username:   meta.username,
      first_name: meta.first_name,
      last_name:  meta.last_name ?? null,
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  // Route based on whether the user has an org yet
  try {
    const payload = JSON.parse(atob(session.access_token.split('.')[1]!))
    return sendRedirect(event, payload.org_id ? '/admin' : '/onboarding')
  } catch {
    return sendRedirect(event, '/onboarding')
  }
})
