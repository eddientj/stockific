export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('org_id', orgId)
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
