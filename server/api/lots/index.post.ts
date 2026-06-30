export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  await requireFeature(orgId, 'batchTracking')

  const body = await readBody(event)
  const supabase = useSupabaseAdmin()

  const variant_id  = optionalUuid(body, 'variant_id')
  if (!variant_id) throw createError({ statusCode: 400, statusMessage: 'Field "variant_id" is required' })
  const product_id  = optionalUuid(body, 'product_id')
  const qty         = Math.max(1, Math.floor(Number(body.qty_received) || 1))
  const batch_number = optionalString(body, 'batch_number', 200)
  const expiry_date  = optionalString(body, 'expiry_date', 20) || null
  const unit_cost    = body.unit_cost != null ? Math.max(0, Number(body.unit_cost) || 0) : null
  const notes        = optionalString(body, 'notes', 2000)
  const received_at  = optionalString(body, 'received_at', 20) || new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('stock_lots')
    .insert({
      org_id: orgId,
      variant_id,
      product_id,
      batch_number,
      expiry_date,
      qty_received:  qty,
      qty_remaining: qty,
      unit_cost,
      notes,
      received_at,
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
