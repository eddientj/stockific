export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const { search, categoryId } = getQuery(event)
  const supabase = useSupabaseAdmin()

  let q = supabase
    .from('products')
    .select('id, name, description, price, image_url, is_active, category_id, created_at, categories(name), variants(id, name, stock_quantity, stock_on_hold)')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false })

  if (typeof search === 'string' && search.trim()) q = q.ilike('name', `%${search.trim()}%`)
  if (typeof categoryId === 'string' && categoryId) q = q.eq('category_id', categoryId)

  const { data, error } = await q
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
