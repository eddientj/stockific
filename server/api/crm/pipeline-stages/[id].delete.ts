export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  const supabase = useSupabaseAdmin()

  // Null out stage_id on any leads using this stage before deleting
  await supabase.from('leads').update({ stage_id: null }).eq('stage_id', id).eq('org_id', orgId)

  const { error } = await supabase
    .from('pipeline_stages')
    .delete()
    .eq('id', id)
    .eq('org_id', orgId)

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { success: true }
})
