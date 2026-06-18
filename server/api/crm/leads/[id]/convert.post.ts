export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  const supabase = useSupabaseAdmin()

  // Fetch lead to get name and linked customer info
  const { data: lead, error: lErr } = await supabase
    .from('leads')
    .select('id, name, email, phone, order_id, org_id')
    .eq('id', id)
    .eq('org_id', orgId)
    .single()

  if (lErr) throw createError({ statusCode: lErr.code === 'PGRST116' ? 404 : 500, statusMessage: lErr.message })
  if (lead.order_id) throw createError({ statusCode: 409, statusMessage: 'Lead is already converted to an order' })

  // Create a draft order from the lead
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .insert({
      org_id:        orgId,
      order_number:  '',
      customer_name: lead.name,
      customer_email: lead.email ?? null,
      customer_phone: lead.phone ?? null,
      status:        'Pending',
      shipping:      0,
    })
    .select('id, order_number')
    .single()

  if (oErr) throw createError({ statusCode: 500, statusMessage: oErr.message })

  // Link the order back to the lead
  const { error: uErr } = await supabase
    .from('leads')
    .update({ order_id: order.id })
    .eq('id', id)
    .eq('org_id', orgId)

  if (uErr) throw createError({ statusCode: 500, statusMessage: uErr.message })

  return { order_id: order.id, order_number: order.order_number }
})
