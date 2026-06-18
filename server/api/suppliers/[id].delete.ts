export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')!
  const sb = useSupabaseAdmin()

  const { error } = await sb
    .from('suppliers')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
