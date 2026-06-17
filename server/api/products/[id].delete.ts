export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing product id' })

  const supabase = useSupabaseAdmin()

  const { data: openItems } = await supabase
    .from('order_items')
    .select('id, orders!inner(status, org_id)')
    .eq('product_id', id)
    .eq('orders.org_id', orgId)
    .not('orders.status', 'in', '(Cancelled,Delivered)')
    .limit(1)

  if (openItems && openItems.length > 0) {
    throw createError({ statusCode: 409, statusMessage: 'This product has open orders. Deactivate it instead of deleting.' })
  }

  const { error } = await supabase.from('products').delete().eq('id', id).eq('org_id', orgId)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
