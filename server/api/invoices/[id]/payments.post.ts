export default defineEventHandler(async (event) => {
  const invoiceId = getRouterParam(event, 'id')
  const supabase  = useSupabaseAdmin()
  const body      = await readBody(event)

  // Insert payment
  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount:     body.amount,
      method:     body.method    ?? 'cash',
      reference:  body.reference ?? null,
      notes:      body.notes     ?? null,
      paid_at:    body.paid_at   ?? new Date().toISOString(),
    })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  // Check if total paid >= invoice total → auto-mark as paid
  const { data: allPayments } = await supabase
    .from('payments')
    .select('amount')
    .eq('invoice_id', invoiceId)

  const { data: invoice } = await supabase
    .from('invoices')
    .select('status, tax_rate, discount, invoice_items(qty, unit_price)')
    .eq('id', invoiceId)
    .single()

  if (invoice && allPayments) {
    const items    = (invoice.invoice_items as { qty: number; unit_price: number }[]) ?? []
    const subtotal = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
    const tax      = Math.round(subtotal * (invoice.tax_rate ?? 0) / 100 * 100) / 100
    const total    = Math.round((subtotal + tax - (invoice.discount ?? 0)) * 100) / 100
    const paid     = allPayments.reduce((s, p) => s + Number(p.amount), 0)

    if (paid >= total && invoice.status !== 'paid') {
      await supabase.from('invoices').update({ status: 'paid' }).eq('id', invoiceId)
    }
  }

  return payment
})
