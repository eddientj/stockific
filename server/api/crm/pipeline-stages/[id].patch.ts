export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readJsonBody<Record<string, unknown>>(event)

  const patch: Record<string, unknown> = {}
  if ('name'           in body) patch.name           = requireString(body, 'name', 100)
  if ('color'          in body) patch.color          = optionalString(body, 'color', 20) ?? '#6366f1'
  if ('position'       in body) patch.position       = requireNumber(body, 'position', { min: 0 })
  if ('is_closed_won'  in body) patch.is_closed_won  = body.is_closed_won  === true
  if ('is_closed_lost' in body) patch.is_closed_lost = body.is_closed_lost === true

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) throw createError({ statusCode: error.code === 'PGRST116' ? 404 : 500, statusMessage: error.message })
  return data
})
