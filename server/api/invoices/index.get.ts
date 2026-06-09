export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(name, email), invoice_items(*)')
    .order('created_at', { ascending: false })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
