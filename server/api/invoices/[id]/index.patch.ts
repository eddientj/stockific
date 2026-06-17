import type { InvoicePayload } from '~~/app/types'

export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id   = getRouterParam(event, 'id')!
  const body = await readJsonBody<Partial<InvoicePayload>>(event)
  const supabase = useSupabaseAdmin()

  const patch: Record<string, unknown> = {}
  if (body.customer_id   !== undefined) patch.customer_id   = optionalUuid(body as any, 'customer_id')
  if (body.customer_name !== undefined) patch.customer_name = optionalString(body as any, 'customer_name', 200)
  if (body.issue_date    !== undefined) patch.issue_date    = requireString(body as any, 'issue_date', 20)
  if (body.due_date      !== undefined) patch.due_date      = optionalString(body as any, 'due_date', 20)
  if (body.status        !== undefined) patch.status        = body.status
  if (body.tax_rate      !== undefined) patch.tax_rate      = body.tax_rate
  if (body.discount      !== undefined) patch.discount      = body.discount
  if (body.notes         !== undefined) patch.notes         = optionalString(body as any, 'notes', 5000)
  if (body.payment_terms !== undefined) patch.payment_terms = optionalString(body as any, 'payment_terms', 500)

  if (Array.isArray(body.items)) {
    await supabase.from('invoice_items').delete().eq('invoice_id', id)

    const items = body.items.map(i => ({
      invoice_id:  id,
      org_id:      orgId,
      description: String(i.description ?? '').trim() || 'Item',
      qty:         Math.max(0, Number(i.qty) || 0),
      unit_price:  Math.max(0, Number(i.unit_price) || 0),
      subtotal:    Math.round(Number(i.qty) * Number(i.unit_price) * 100) / 100,
    }))

    if (items.length > 0) {
      const { error: iErr } = await supabase.from('invoice_items').insert(items)
      if (iErr) throw createError({ statusCode: 500, statusMessage: iErr.message })
    }

    const subtotal = items.reduce((s, i) => s + i.subtotal, 0)
    const taxRate  = typeof body.tax_rate === 'number' ? body.tax_rate : 6
    const discount = typeof body.discount === 'number' ? body.discount : 0
    patch.subtotal = subtotal
    patch.total    = Math.round((subtotal + Math.round(subtotal * (taxRate / 100) * 100) / 100 - discount) * 100) / 100
  }

  const { data, error } = await supabase
    .from('invoices')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select('*, customers(name, email), invoice_items(*)')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
