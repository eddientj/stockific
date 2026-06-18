export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const query = getQuery(event)
  const search = typeof query.search === 'string' ? query.search.trim() : ''

  const supabase = useSupabaseAdmin()
  let q = supabase
    .from('companies')
    .select('id, name, industry, website, phone, email, created_at')
    .eq('org_id', orgId)
    .order('name', { ascending: true })

  if (search) q = q.ilike('name', `%${search}%`)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
