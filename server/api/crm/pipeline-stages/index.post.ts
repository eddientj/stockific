export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const body = await readJsonBody<Record<string, unknown>>(event)

  const name           = requireString(body, 'name', 100)
  const color          = optionalString(body, 'color', 20) ?? '#6366f1'
  const is_closed_won  = body.is_closed_won  === true
  const is_closed_lost = body.is_closed_lost === true

  const supabase = useSupabaseAdmin()

  // Position = count of existing stages so it appends to the end
  const { count } = await supabase
    .from('pipeline_stages')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', orgId)

  const { data, error } = await supabase
    .from('pipeline_stages')
    .insert({ org_id: orgId, name, color, position: count ?? 0, is_closed_won, is_closed_lost })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
