export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('companies')
    .select('*, activities(id, type, body, created_by, created_at)')
    .eq('id', id)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false, referencedTable: 'activities' })
    .single()

  if (error) throw createError({ statusCode: error.code === 'PGRST116' ? 404 : 500, statusMessage: error.message })
  return data
})
