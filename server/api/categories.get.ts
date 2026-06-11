export default defineEventHandler(async () => {
  const supabase = useSupabaseAdmin()

  const [{ data: cats, error }, { data: prods }] = await Promise.all([
    supabase.from('categories').select('id, name').order('name'),
    supabase.from('products').select('category_id').not('category_id', 'is', null),
  ])

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })

  const countMap = new Map<string, number>()
  for (const p of prods ?? []) {
    if (p.category_id) countMap.set(p.category_id, (countMap.get(p.category_id) ?? 0) + 1)
  }

  return (cats ?? []).map(c => ({ ...c, product_count: countMap.get(c.id) ?? 0 }))
})
