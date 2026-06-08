export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('categories')
    .select('id, name')
    .order('name')
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
