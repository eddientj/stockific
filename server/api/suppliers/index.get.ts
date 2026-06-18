export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const sb = useSupabaseAdmin()

  const { data, error } = await sb
    .from('suppliers')
    .select('*')
    .eq('org_id', orgId)
    .order('name')

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
