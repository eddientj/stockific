export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing product id' })

  const supabase = useSupabaseAdmin()

  // Block delete if open (active) orders reference this product
  const { data: openItems } = await supabase
    .from('order_items')
    .select('id, orders!inner(status)')
    .eq('product_id', id)
    .not('orders.status', 'in', '(Cancelled,Delivered)')
    .limit(1)

  if (openItems && openItems.length > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: 'This product has open orders. Deactivate it instead of deleting.',
    })
  }

  const { error } = await supabase.from('products').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
