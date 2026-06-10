export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('id', 1)
    .single()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
