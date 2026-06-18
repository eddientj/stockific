export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  const supabase = useSupabaseAdmin()
  const { error } = await supabase
    .from('companies')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
