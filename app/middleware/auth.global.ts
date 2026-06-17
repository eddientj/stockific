export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return
  if (import.meta.server) return // session checked client-side after hydration

  const { $supabase } = useNuxtApp()
  const { data: { session } } = await $supabase.auth.getSession()

  if (!session) return navigateTo('/login')

  if (!decodeJwt(session.access_token).org_id) return navigateTo('/onboarding')
})
