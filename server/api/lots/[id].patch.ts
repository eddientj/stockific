export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  await requireFeature(orgId, 'batchTracking')

  const id   = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'Missing lot id' })

  const body = await readBody(event)
  const supabase = useSupabaseAdmin()

  const update: Record<string, any> = {}
  if (body.qty_remaining !== undefined) {
    update.qty_remaining = Math.max(0, Math.floor(Number(body.qty_remaining) || 0))
  }
  if (body.notes !== undefined) {
    update.notes = String(body.notes || '').trim() || null
  }

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
