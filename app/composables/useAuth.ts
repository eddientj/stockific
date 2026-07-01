import type { User, Session } from '@supabase/supabase-js'

export function decodeJwt(token: string): Record<string, any> {
  try { return JSON.parse(atob(token.split('.')[1]!)) } catch { return {} }
}

export function useAuth() {
  const { $supabase } = useNuxtApp()

  const user    = useState<User | null>('auth.user', () => null)
  const session = useState<Session | null>('auth.session', () => null)
  const loading = useState('auth.loading', () => false)

  function jwtClaim(key: string): string | null {
    const token = session.value?.access_token
    return token ? (decodeJwt(token)[key] ?? null) : null
  }

  function orgId(): string | null  { return jwtClaim('org_id') }
  function orgRole(): string | null { return jwtClaim('org_role') }

  const displayName = computed<string>(() => {
    const meta = user.value?.user_metadata
    if (meta?.first_name) {
      return meta.last_name ? `${meta.first_name} ${meta.last_name}` : meta.first_name
    }
    return user.value?.email ?? ''
  })

  async function init() {
    const { data } = await $supabase.auth.getSession()
    session.value = data.session
    user.value    = data.session?.user ?? null
    $supabase.auth.onAuthStateChange((_event, s) => {
      session.value = s
      user.value    = s?.user ?? null
    })
  }

  // Accepts email or username — resolves username to email before signing in.
  async function signIn(identifier: string, password: string) {
    loading.value = true
    try {
      let email = identifier
      if (!identifier.includes('@')) {
        const { data, error } = await $supabase.rpc('get_email_by_username', { p_username: identifier.toLowerCase() })
        if (error || !data) throw new Error('Username not found')
        email = data as string
      }
      const { error } = await $supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
    } finally {
      loading.value = false
    }
  }

  async function signInWithGoogle() {
    const { error } = await $supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) throw error
  }

  async function signUp(
    email: string,
    password: string,
    metadata: { username: string; first_name: string; last_name?: string },
  ) {
    loading.value = true
    const { data, error } = await $supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: metadata,
      },
    })
    loading.value = false
    if (error) throw error
    return data
  }

  async function updateProfile(data: { first_name?: string; last_name?: string; username?: string }) {
    const { error } = await $supabase.auth.updateUser({ data })
    if (error) throw error
    if (user.value) {
      await $supabase.from('profiles').update(data).eq('id', user.value.id)
    }
  }

  async function updatePassword(newPassword: string) {
    const { error } = await $supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  async function signOut() {
    await $supabase.auth.signOut()
    await navigateTo('/login')
  }

  return { user, session, loading, orgId, orgRole, displayName, init, signIn, signInWithGoogle, signUp, updateProfile, updatePassword, signOut }
}
