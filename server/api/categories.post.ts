export default defineEventHandler(async (event) => {
  const { name } = await readBody(event)
  if (!name?.trim()) throw createError({ statusCode: 400, statusMessage: 'Name is required' })

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: name.trim() })
    .select('id, name')
    .single()

  if (error) throw createError({ statusCode: 400, statusMessage: error.message })
  return { ...data, product_count: 0 }
})
