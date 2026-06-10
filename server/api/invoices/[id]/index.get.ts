export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(name, email), invoice_items(*)')
    .eq('id', id)
    .single()
  if (error) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
  return data
})
