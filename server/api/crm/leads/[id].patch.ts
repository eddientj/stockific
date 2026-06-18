export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readJsonBody<Record<string, unknown>>(event)

  const patch: Record<string, unknown> = {}
  if ('name'       in body) patch.name       = requireString(body, 'name', 200)
  if ('email'      in body) patch.email      = optionalString(body, 'email', 500)
  if ('phone'      in body) patch.phone      = optionalString(body, 'phone', 50)
  if ('source'     in body) patch.source     = optionalString(body, 'source', 100)
  if ('notes'      in body) patch.notes      = optionalString(body, 'notes', 2000)
  if ('company_id' in body) patch.company_id = optionalUuid(body, 'company_id')
  if ('stage_id'   in body) patch.stage_id   = optionalUuid(body, 'stage_id')
  if ('value'      in body) {
    const v = body.value != null ? Number(body.value) : null
    if (v !== null && (!Number.isFinite(v) || v < 0)) {
      throw createError({ statusCode: 400, statusMessage: 'Field "value" must be a non-negative number' })
    }
    patch.value = v
  }

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('leads')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select(`
      *,
      stage:pipeline_stages(id, name, color, is_closed_won, is_closed_lost),
      company:companies(id, name)
    `)
    .single()

  if (error) throw createError({ statusCode: error.code === 'PGRST116' ? 404 : 500, statusMessage: error.message })
  return data
})
