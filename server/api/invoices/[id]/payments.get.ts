export default defineEventHandler(async (event) => {
  const id       = getRouterParam(event, 'id')
  const supabase = useSupabaseAdmin()

  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('invoice_id', id)
    .order('paid_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
