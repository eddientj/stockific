export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()
  const { error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message })
  }
  return { ok: true, products: count ?? 0 }
})
