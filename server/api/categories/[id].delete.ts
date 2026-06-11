export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  const supabase = useSupabaseAdmin()
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id!)

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return { success: true }
})
