export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const poId = getRouterParam(event, 'id')!
  const { items } = await readBody(event) // [{ poi_id, qty }]
  const sb = useSupabaseAdmin()

  const { error } = await sb.rpc('receive_po_items', {
    p_org_id: orgId,
    p_po_id:  poId,
    p_items:  items,
  })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
