export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('org_id', orgId)
    .order('position', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
