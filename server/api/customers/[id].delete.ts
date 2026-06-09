export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const supabase = useSupabaseAdmin()
  const { error } = await supabase.from('customers').delete().eq('id', id)
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return { ok: true }
})
