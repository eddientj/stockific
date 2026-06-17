export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase = useSupabaseAdmin()

  const { data, error } = await supabase
    .from('orders')
    .select(`*, order_items(*, product:products(id, name, is_active, variants(stock_quantity, stock_on_hold)))`)
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
