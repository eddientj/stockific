export default defineEventHandler(async (event) => {
  const supabase = useSupabaseAdmin()
  const body     = await readBody(event)

  // Insert order (order_number set by DB trigger)
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      order_number:      '',          // trigger overwrites this
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

  // Insert items
  if (Array.isArray(body.items) && body.items.length > 0) {
    const items = body.items.map((i: any) => ({
      order_id: order.id,
      name:     String(i.name    ?? '').trim() || 'Item',
      variant:  String(i.variant ?? '').trim() || null,
      qty:      Math.max(1, Number(i.qty)   || 1),
      price:    Math.max(0, Number(i.price) || 0),
    }))
    const { error: iErr } = await supabase.from('order_items').insert(items)
    if (iErr) throw createError({ statusCode: 500, statusMessage: iErr.message })
  }

  // Return full order with items
  const { data: full, error: fErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', order.id)
    .single()

  if (fErr) throw createError({ statusCode: 500, statusMessage: fErr.message })
  return full
})
