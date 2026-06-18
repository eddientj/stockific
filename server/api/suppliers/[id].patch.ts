export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id   = getRouterParam(event, 'id')!
  const body = await readBody(event)
  const sb   = useSupabaseAdmin()

  const { data, error } = await sb
    .from('suppliers')
    .update(body)
    .eq('id', id)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
