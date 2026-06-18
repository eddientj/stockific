export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const sb = useSupabaseAdmin()

  const { data, error } = await sb
    .from('purchase_orders')
    .select(`
      *,
      supplier:suppliers(id, name, email, phone),
      items:purchase_order_items(
        id, qty_ordered, qty_received, unit_cost,
        product:products(id, name),
        variant:variants(id, name, sku, stock_quantity, cost_price)
      )
    `)
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (error) throw createError({ statusCode: 404, statusMessage: 'Not found' })
  return data
})
