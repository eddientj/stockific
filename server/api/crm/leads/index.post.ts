export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const body = await readJsonBody<Record<string, unknown>>(event)

  const name       = requireString(body, 'name', 200)
  const email      = optionalString(body, 'email', 500)
  const phone      = optionalString(body, 'phone', 50)
  const source     = optionalString(body, 'source', 100)
  const notes      = optionalString(body, 'notes', 2000)
  const company_id = optionalUuid(body, 'company_id')
  const stage_id   = optionalUuid(body, 'stage_id')
  const value      = body.value != null ? Number(body.value) : null

  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    throw createError({ statusCode: 400, statusMessage: 'Field "value" must be a non-negative number' })
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('leads')
    .insert({ org_id: orgId, name, email, phone, source, notes, company_id, stage_id, value })
    .select(`
      id, name, email, phone, value, source, created_at,
      stage:pipeline_stages(id, name, color),
      company:companies(id, name)
    `)
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
