export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const itemId = getRouterParam(event, 'itemId')!
  const sb     = useSupabaseAdmin()

  const { error } = await sb
    .from('purchase_order_items')
    .delete()
    .eq('id', itemId)
    .eq('org_id', orgId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
