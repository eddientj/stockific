export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const query = getQuery(event)
  const sb    = useSupabaseAdmin()

  let q = sb
    .from('stock_adjustments')
    .select('*, product:products(id, name), variant:variants(id, name, sku)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .limit(Number(query.limit ?? 50))

  if (query.variant_id) q = q.eq('variant_id', query.variant_id as string)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
