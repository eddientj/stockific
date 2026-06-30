import type { H3Event } from 'h3'

export async function requirePlatformAdmin(event: H3Event) {
  const { user } = await requireUser(event)
  const supabase = useSupabaseAdmin()

  const { data } = await supabase
    .from('profiles')
    .select('is_platform_admin')
    .eq('id', user.id)
    .single()

  if (!data?.is_platform_admin) {
    throw createError({ statusCode: 403, statusMessage: 'Platform admin access required' })
  }

  return { user }
}
