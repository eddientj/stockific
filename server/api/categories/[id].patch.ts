export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')
  const { name } = await readBody(event)
  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Name is required' })

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('categories')
    .update({ name: name.trim() })
    .eq('id', id!)
    .eq('org_id', orgId)
    .select('id, name')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return data
})
