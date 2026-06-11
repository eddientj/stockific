// Status transitions that affect stock
const HOLD_ON_ENTER  = new Set(['Confirmed'])          // Pending → Confirmed: apply hold
const HOLD_RELEASE   = new Set(['Cancelled'])          // any held state → Cancelled: release
const STOCK_DEDUCT   = new Set(['Delivered'])          // Shipped → Delivered: deduct

export default defineEventHandler(async (event) => {
  const id      = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()
  const body    = await readBody(event)

  // Fetch current status before patching (needed for stock transition logic)
  const { data: current, error: fetchErr } = await supabase
    .from('orders')
    .select('status')
    .eq('id', id)
    .single()
  if (fetchErr) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  const prevStatus = current.status as string
  const nextStatus = (body.status ?? prevStatus) as string

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

  // If items array provided → replace all items (preserve product/variant links)
  if (Array.isArray(body.items)) {
    const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', id)
    if (delErr) throw createError({ statusCode: 500, statusMessage: delErr.message })

    if (body.items.length > 0) {
      const rows = body.items.map((i: any) => ({
        order_id:   id,
        name:       String(i.name    ?? '').trim() || 'Item',
        variant:    String(i.variant ?? '').trim() || null,
        qty:        Math.max(1, Number(i.qty)   || 1),
        price:      Math.max(0, Number(i.price) || 0),
        product_id: i.product_id ?? null,
        variant_id: i.variant_id ?? null,
      }))
      const { error: insErr } = await supabase.from('order_items').insert(rows)
      if (insErr) throw createError({ statusCode: 500, statusMessage: insErr.message })
    }
  }

  // ── Stock side-effects based on status transition ────────────
  if (prevStatus !== nextStatus) {
    const wasHeld = ['Confirmed', 'Shipped'].includes(prevStatus)

    if (HOLD_ON_ENTER.has(nextStatus) && prevStatus === 'Pending') {
      // Pending → Confirmed: reserve stock
      await supabase.rpc('apply_order_hold', { p_order_id: id })

    } else if (HOLD_RELEASE.has(nextStatus) && wasHeld) {
      // Confirmed/Shipped → Cancelled: release hold
      await supabase.rpc('release_order_hold', { p_order_id: id })

    } else if (STOCK_DEDUCT.has(nextStatus) && prevStatus === 'Shipped') {
      // Shipped → Delivered: permanently deduct stock
      await supabase.rpc('deduct_order_stock', { p_order_id: id })
    }
  }

  // Return full order with fresh items + product stock info for frontend warnings
  const { data, error: retErr } = await supabase
    .from('orders')
    .select('*, order_items(*, product:products(id, name, is_active, variants(stock_quantity, stock_on_hold)))')
    .eq('id', id)
    .single()

  if (retErr) throw createError({ statusCode: 500, statusMessage: retErr.message })
  return data
})
