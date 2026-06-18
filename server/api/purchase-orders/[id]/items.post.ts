export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const poId = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const sb   = useSupabaseAdmin()

  // Verify PO belongs to org and is still editable
  const { data: po } = await sb
    .from('purchase_orders')
    .select('status')
    .eq('id', poId)
    .eq('org_id', orgId)
    .single()

  if (!po) throw createError({ statusCode: 404, statusMessage: 'Purchase order not found' })
  if (po.status === 'received' || po.status === 'cancelled')
    throw createError({ statusCode: 400, statusMessage: 'Cannot edit a closed purchase order' })

  const { data, error } = await sb
    .from('purchase_order_items')
    .insert({ ...body, po_id: poId, org_id: orgId })
    .select('id, qty_ordered, qty_received, unit_cost, product:products(id, name), variant:variants(id, name, sku, stock_quantity, cost_price)')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
