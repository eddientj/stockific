export default defineEventHandler(async (event) => {
  const id      = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()
  const body    = await readBody(event)

  // Fields allowed in a PATCH
  const ALLOWED = [
    'status',
    'notes', 'shipping',
    'customer_id', 'customer_name', 'customer_email', 'customer_phone',
    'customer_address', 'customer_city', 'customer_postcode',
  ]
  const patch = Object.fromEntries(
    Object.entries(body).filter(([k]) => ALLOWED.includes(k))
  )

  if (Object.keys(patch).length) {
    const { error } = await supabase.from('orders').update(patch).eq('id', id)
    if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  }

  // If items array provided → replace all items
  if (Array.isArray(body.items)) {
    const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', id)
    if (delErr) throw createError({ statusCode: 500, statusMessage: delErr.message })

    if (body.items.length > 0) {
      const rows = body.items.map((i: any) => ({
        order_id: id,
        name:    String(i.name    ?? '').trim() || 'Item',
        variant: String(i.variant ?? '').trim() || null,
        qty:     Math.max(1, Number(i.qty)   || 1),
        price:   Math.max(0, Number(i.price) || 0),
      }))
      const { error: insErr } = await supabase.from('order_items').insert(rows)
      if (insErr) throw createError({ statusCode: 500, statusMessage: insErr.message })
    }
  }

  // Return full order with fresh items
  const { data, error: fetchErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', id)
    .single()

  if (fetchErr) throw createError({ statusCode: 500, statusMessage: fetchErr.message })
  return data
})
