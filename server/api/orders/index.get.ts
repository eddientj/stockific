export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()

  // Include product stock info so the frontend can show out-of-stock / discontinued warnings
  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      order_items(
        *,
        product:products(id, name, is_active, variants(stock_quantity, stock_on_hold))
      )
    `)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
