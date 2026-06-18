export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const body = await readBody(event)
  const sb   = useSupabaseAdmin()

  // Generate PO number via DB function
  const { data: poNum } = await sb.rpc('next_po_number', { p_org_id: orgId })

  const { data, error } = await sb
    .from('purchase_orders')
    .insert({ ...body, org_id: orgId, po_number: poNum })
    .select('*, supplier:suppliers(id, name)')
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
