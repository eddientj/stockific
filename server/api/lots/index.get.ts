export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  await requireFeature(orgId, 'batchTracking')

  const supabase = useSupabaseAdmin()
  const query = getQuery(event)
  const expiringDays = query.expiring_days ? Number(query.expiring_days) : null

  let q = supabase
    .from('stock_lots')
    .select(`
      id, batch_number, expiry_date, qty_received, qty_remaining,
      unit_cost, notes, received_at, created_at,
      variants(id, name, sku),
      products(id, name)
    `)
    .eq('org_id', orgId)
    .order('expiry_date', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (expiringDays !== null) {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + expiringDays)
    q = q
      .not('expiry_date', 'is', null)
      .lte('expiry_date', cutoff.toISOString().slice(0, 10))
      .gt('qty_remaining', 0)
  }

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})
