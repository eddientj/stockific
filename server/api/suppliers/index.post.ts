export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const body = await readBody(event)
  const sb = useSupabaseAdmin()

  const { data, error } = await sb
    .from('suppliers')
    .insert({ ...body, org_id: orgId })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
