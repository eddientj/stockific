import type { InvoicePayload } from '~~/app/types'

export default defineEventHandler(async (event) => {
  const body = await readJsonBody<InvoicePayload>(event)

  const supabase = useSupabaseAdmin()

  // Generate next invoice number: INV-YYYY-XXXX
  const year = new Date().getFullYear()
  const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true })
  const seq = String((count ?? 0) + 1).padStart(4, '0')
  const invoice_number = `INV-${year}-${seq}`

  const customer_id   = optionalUuid(body as any, 'customer_id')
  const customer_name = optionalString(body as any, 'customer_name', 200)
  const issue_date    = requireString(body as any, 'issue_date', 20)
  const due_date      = optionalString(body as any, 'due_date', 20)
  const notes         = optionalString(body as any, 'notes', 5000)
  const payment_terms = optionalString(body as any, 'payment_terms', 500)
  const tax_rate      = typeof body.tax_rate === 'number' ? body.tax_rate : 6
  const discount      = typeof body.discount === 'number' ? body.discount : 0
  const status        = body.status ?? 'draft'

  const rawItems = Array.isArray(body.items) ? body.items : []
  const items = rawItems.map(i => ({
    description: String(i.description ?? '').trim() || 'Item',
    qty:         Math.max(0, Number(i.qty) || 0),
    unit_price:  Math.max(0, Number(i.unit_price) || 0),
    subtotal:    Math.round(Number(i.qty) * Number(i.unit_price) * 100) / 100,
  }))

  const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
  const taxAmt   = Math.round(subtotal * (tax_rate / 100) * 100) / 100
  const total    = Math.round((subtotal + taxAmt - discount) * 100) / 100

  const { data: inv, error } = await supabase
    .from('invoices')
    .insert({ invoice_number, customer_id, customer_name, issue_date, due_date,
              status, subtotal, tax_rate, discount, total, notes, payment_terms })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  if (items.length > 0) {
    const { error: iErr } = await supabase
      .from('invoice_items')
      .insert(items.map(i => ({ ...i, invoice_id: inv.id })))
    if (iErr) throw createError({ statusCode: 500, statusMessage: iErr.message })
  }

  return inv
})
