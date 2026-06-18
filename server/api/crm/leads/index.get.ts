export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const query = getQuery(event)
  const search   = typeof query.search   === 'string' ? query.search.trim()   : ''
  const stageId  = typeof query.stage_id === 'string' ? query.stage_id        : null
  const page     = Math.max(1, Number(query.page)  || 1)
  const limit    = Math.min(100, Math.max(1, Number(query.limit) || 50))
  const from     = (page - 1) * limit

  const supabase = useSupabaseAdmin()
  let q = supabase
    .from('leads')
    .select(`
      id, name, email, phone, value, source, created_at, updated_at,
      stage:pipeline_stages(id, name, color),
      company:companies(id, name)
    `, { count: 'exact' })
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })
    .range(from, from + limit - 1)

  if (search)  q = q.or(`name.ilike.%${search}%,email.ilike.%${search}%`)
  if (stageId) q = q.eq('stage_id', stageId)

  const { data, error, count } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { data, total: count ?? 0, page, limit }
})
