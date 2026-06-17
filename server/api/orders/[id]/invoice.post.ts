export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const orderId  = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()

  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('id', orderId)
    .eq('org_id', orgId)
    .single()

  if (oErr || !order) throw createError({ statusCode: 404, statusMessage: 'Order not found' })
  if (order.status === 'Cancelled') {
    throw createError({ statusCode: 400, statusMessage: 'Cannot create invoice for a cancelled order.' })
  }

  const { data: settings } = await supabase
    .from('business_settings')
    .select('next_invoice_number, invoice_prefix, default_tax_rate, default_payment_terms')
    .eq('org_id', orgId)
    .single()

  const tax_rate      = settings?.default_tax_rate      ?? 6
  const payment_terms = settings?.default_payment_terms ?? '30 days'

  // Per-org invoice number
  const year   = new Date().getFullYear()
  const seq    = String(settings?.next_invoice_number ?? 1).padStart(4, '0')
  const prefix = settings?.invoice_prefix ?? 'INV'
  const invoice_number = `${prefix}-${year}-${seq}`

  await supabase
    .from('business_settings')
    .update({ next_invoice_number: (settings?.next_invoice_number ?? 1) + 1 })
    .eq('org_id', orgId)

  const today = new Date()
  const issueStr = today.toISOString().slice(0, 10)
  const dueDate  = new Date(today)
  dueDate.setDate(dueDate.getDate() + (parseInt(String(payment_terms)) || 30))
  const dueStr = dueDate.toISOString().slice(0, 10)

  const rawItems = (order.order_items ?? []).map((i: any) => ({
    description: i.variant ? `${i.name} (${i.variant})` : i.name,
    qty:         i.qty,
    unit_price:  i.price,
    subtotal:    Math.round(i.qty * i.price * 100) / 100,
  }))

  const subtotal = rawItems.reduce((s: number, i: any) => s + i.subtotal, 0)
  const taxAmt   = Math.round(subtotal * (tax_rate / 100) * 100) / 100
  const total    = Math.round((subtotal + taxAmt) * 100) / 100

  const { data: inv, error: invErr } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      org_id:         orgId,
      customer_id:    order.customer_id   ?? null,
      customer_name:  order.customer_name ?? null,
      issue_date:     issueStr,
      due_date:       dueStr,
      status:         'draft',
      subtotal,
      tax_rate,
      discount:       0,
      total,
      notes:          `Order reference: ${order.order_number}`,
      payment_terms,
    })
    .select()
    .single()

  if (invErr) throw createError({ statusCode: 500, statusMessage: invErr.message })

  if (rawItems.length > 0) {
    const { error: iErr } = await supabase
      .from('invoice_items')
      .insert(rawItems.map((i: any) => ({ ...i, invoice_id: inv.id, org_id: orgId })))
    if (iErr) throw createError({ statusCode: 500, statusMessage: iErr.message })
  }

  return { invoice_number: inv.invoice_number, id: inv.id }
})
