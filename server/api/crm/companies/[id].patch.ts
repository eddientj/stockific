export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const body = await readJsonBody<Record<string, unknown>>(event)

  const patch: Record<string, unknown> = {}
  if ('name'     in body) patch.name     = requireString(body, 'name', 200)
  if ('industry' in body) patch.industry = optionalString(body, 'industry', 100)
  if ('website'  in body) patch.website  = optionalString(body, 'website', 500)
  if ('phone'    in body) patch.phone    = optionalString(body, 'phone', 50)
  if ('email'    in body) patch.email    = optionalString(body, 'email', 500)
  if ('address'  in body) patch.address  = optionalString(body, 'address', 500)
  if ('notes'    in body) patch.notes    = optionalString(body, 'notes', 2000)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('companies')
    .update(patch)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) throw createError({ statusCode: error.code === 'PGRST116' ? 404 : 500, statusMessage: error.message })
  return data
})
