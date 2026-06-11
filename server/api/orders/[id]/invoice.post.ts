export default defineEventHandler(async (event) => {
  const orderId = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()

  // Fetch the order with its items
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .single()

  if (oErr || !order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })

  if (order.status === 'Cancelled') {
    throw createError({ statusCode: 400, statusMessage: 'Cannot create invoice for a cancelled order.' })
  }

  // Fetch business settings for tax rate / payment terms defaults
  const { data: settings } = await supabase
    .from('business_settings')
    .select('tax_rate, payment_terms')
    .limit(1)
    .single()

  const tax_rate      = settings?.tax_rate      ?? 6
  const payment_terms = settings?.payment_terms ?? '30 days'

  // Generate next invoice number: INV-YYYY-XXXX
  const year = new Date().getFullYear()
  const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  const invoice_number = `INV-${year}-${seq}`

  // Issue date = today, due date based on payment terms
  const today = new Date()
  const issueStr = today.toISOString().slice(0, 10)
  const dueDate = new Date(today)
  const termDays = parseInt(String(payment_terms)) || 30
  dueDate.setDate(dueDate.getDate() + termDays)
  const dueStr = dueDate.toISOString().slice(0, 10)

  // Map order items → invoice items
  const rawItems = (order.order_items ?? []).map((i: any) => ({
    description: i.variant ? `${i.name} (${i.variant})` : i.name,
    qty:         i.qty,
    unit_price:  i.price,
    subtotal:    Math.round(i.qty * i.price * 100) / 100,
  }))

  const subtotal = rawItems.reduce((s: number, i: any) => s + i.subtotal, 0)
  const taxAmt   = Math.round(subtotal * (tax_rate / 100) * 100) / 100
  const total    = Math.round((subtotal + taxAmt) * 100) / 100

  const notes = `Order reference: ${order.order_number}`

  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      customer_id:    order.customer_id   ?? null,
      customer_name:  order.customer_name ?? null,
      issue_date:     issueStr,
      due_date:       dueStr,
      status:         'draft',
      subtotal,
      tax_rate,
      discount:       0,
      total,
      notes,
      payment_terms,
    })
    .select()
    .single()

  if (invErr) throw createError({ statusCode: 500, statusMessage: invErr.message })

  if (rawItems.length > 0) {
    const { error: iErr } = await supabase
      .from('invoice_items')
      .insert(rawItems.map((i: any) => ({ ...i, invoice_id: inv.id })))
    if (iErr) throw createError({ statusCode: 500, statusMessage: iErr.message })
  }

  return { invoice_number: inv.invoice_number, id: inv.id }
})
