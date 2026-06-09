export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('name', { ascending: true })
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
