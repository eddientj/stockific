export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(name, email), invoice_items(*)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
