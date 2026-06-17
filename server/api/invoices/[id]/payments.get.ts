export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id       = getRouterParam(event, 'id')
  const supabase = useSupabaseAdmin()

  // Verify invoice belongs to this org before returning payments
  const { data: inv } = await supabase
    .from('invoices').select('id').eq('id', id!).eq('org_id', orgId).single()
  if (!inv) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
