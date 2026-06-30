export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  await checkOrderQuota(orgId)
  const supabase = useSupabaseAdmin()
  const body = await readBody(event)

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number:      '',
      org_id:            orgId,
      customer_id:       body.customer_id       ?? null,
      customer_name:     body.customer_name     ?? 'Unknown',
      customer_email:    body.customer_email    ?? null,
      customer_phone:    body.customer_phone    ?? null,
      customer_address:  body.customer_address  ?? null,
      customer_city:     body.customer_city     ?? null,
      customer_postcode: body.customer_postcode ?? null,
      shipping:          Number(body.shipping)  ?? 0,
      notes:             body.notes             ?? null,
      status:            'Pending',
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (Array.isArray(body.items) && body.items.length > 0) {
    const items = body.items.map((i: any) => ({
      order_id:   order.id,
      org_id:     orgId,
      name:       String(i.name    ?? '').trim() || 'Item',
      variant:    String(i.variant ?? '').trim() || null,
      qty:        Math.max(1, Number(i.qty)   || 1),
      price:      Math.max(0, Number(i.price) || 0),
      product_id: i.product_id ?? null,
      variant_id: i.variant_id ?? null,
    }))
    const { error: iErr } = await supabase.from('order_items').insert(items)
    if (iErr) throw createError({ statusCode: 500, statusMessage: iErr.message })
  }

  const { data: full, error: fErr } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(id, name, is_active, variants(stock_quantity, stock_on_hold)))')
    .eq('id', order.id)
    .single()

  if (fErr) throw createError({ statusCode: 500, statusMessage: fErr.message })
  return full
})
