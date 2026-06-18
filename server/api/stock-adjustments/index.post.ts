export default defineEventHandler(async (event) => {
  const { orgId, user } = await requireAuth(event)
  const body = await readBody(event)
  const sb   = useSupabaseAdmin()

  if (!body.variant_id) throw createError({ statusCode: 400, statusMessage: 'variant_id required' })
  if (!body.qty || body.qty === 0) throw createError({ statusCode: 400, statusMessage: 'qty must be non-zero' })
  if (!body.reason?.trim()) throw createError({ statusCode: 400, statusMessage: 'reason required' })

  // Read current stock then apply delta
  const { data: variant, error: vErr } = await sb
    .from('variants')
    .select('stock_quantity')
    .eq('id', body.variant_id)
    .single()

  if (vErr || !variant) throw createError({ statusCode: 404, statusMessage: 'Variant not found' })

  const newQty = Math.max(0, variant.stock_quantity + body.qty)

  await sb.from('variants').update({ stock_quantity: newQty }).eq('id', body.variant_id)

  // Log the adjustment
  const { data, error } = await sb
    .from('stock_adjustments')
    .insert({
      org_id:      orgId,
      variant_id:  body.variant_id,
      product_id:  body.product_id ?? null,
      qty:         body.qty,
      reason:      body.reason,
      adjusted_by: user.id,
    })
    .select('*, product:products(id, name), variant:variants(id, name, sku)')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
