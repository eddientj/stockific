export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing product id' })

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('products')
    .select('*, categories(id, name), variants(id, name, sku, stock_quantity, price_override)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') throw createError({ statusCode: 404, statusMessage: 'Product not found' })
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return data
})
