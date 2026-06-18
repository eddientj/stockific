export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const query = getQuery(event)
  const leadId    = typeof query.lead_id    === 'string' ? query.lead_id    : null
  const companyId = typeof query.company_id === 'string' ? query.company_id : null

  if (!leadId && !companyId) {
    throw createError({ statusCode: 400, statusMessage: 'Provide lead_id or company_id' })
  }

  const supabase = useSupabaseAdmin()
  let q = supabase
    .from('activities')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (leadId)    q = q.eq('lead_id', leadId)
  if (companyId) q = q.eq('company_id', companyId)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
