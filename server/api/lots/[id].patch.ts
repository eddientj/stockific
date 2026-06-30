export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  await requireFeature(orgId, 'batchTracking')

  const id   = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing lot id' })

  const body = await readBody(event)
  const supabase = useSupabaseAdmin()

  const update: Record<string, any> = {}
  if (body.batch_number  !== undefined) update.batch_number  = optionalString(body, 'batch_number', 200)
  if (body.expiry_date   !== undefined) update.expiry_date   = optionalString(body, 'expiry_date', 20) || null
  if (body.qty_received  !== undefined) update.qty_received  = Math.max(1, Math.floor(Number(body.qty_received) || 1))
  if (body.qty_remaining !== undefined) update.qty_remaining = Math.max(0, Math.floor(Number(body.qty_remaining) || 0))
  if (body.unit_cost     !== undefined) update.unit_cost     = body.unit_cost != null ? Math.max(0, Number(body.unit_cost) || 0) : null
  if (body.received_at   !== undefined) update.received_at   = optionalString(body, 'received_at', 20) || null
  if (body.notes         !== undefined) update.notes         = optionalString(body, 'notes', 2000)

  if (!Object.keys(update).length) throw createError({ statusCode: 400, statusMessage: 'Nothing to update' })

  const { data, error } = await supabase
    .from('stock_lots')
    .update(update)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
