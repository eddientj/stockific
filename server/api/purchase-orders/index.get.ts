export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const sb = useSupabaseAdmin()

  const { data, error } = await sb
    .from('purchase_orders')
    .select('*, supplier:suppliers(id, name)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
