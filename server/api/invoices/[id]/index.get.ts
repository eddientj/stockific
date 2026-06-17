export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(name, email), invoice_items(*)')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  return data
})
