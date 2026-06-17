export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event)
  const { name } = await readBody(event)
  if (!name?.trim()) throw createError({ statusCode: 400, message: 'Business name is required' })

  const supabase = useSupabaseAdmin()

  const { data: existing } = await supabase
    .from('org_users')
    .select('org_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) throw createError({ statusCode: 409, message: 'Organisation already exists' })

  const { data, error } = await supabase.rpc('create_organisation', {
    p_user_id: user.id,
    p_name: name.trim(),
  })

  if (error) throw createError({ statusCode: 500, message: error.message })

  await supabase
    .from('business_settings')
    .update({ company_name: name.trim() })
    .eq('org_id', data)

  return { org_id: data }
})
