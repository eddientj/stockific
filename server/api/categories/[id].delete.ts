export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  const supabase = useSupabaseAdmin()
  const { error } = await supabase.from('categories').delete().eq('id', id!).eq('org_id', orgId)

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return { success: true }
})
