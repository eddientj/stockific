export default defineNuxtRouteMiddleware(async (to) => {
  const isAdmin    = to.path.startsWith('/admin')
  const isPlatform = to.path.startsWith('/platform')
  if (!isAdmin && !isPlatform) return
  if (import.meta.server) return // session checked client-side after hydration

  const { $supabase } = useNuxtApp()
  const { data: { session } } = await $supabase.auth.getSession()

  if (!session) return navigateTo('/login')

  // Admin requires an org; platform admin check is handled server-side
  if (isAdmin && !decodeJwt(session.access_token).org_id) return navigateTo('/onboarding')
})
