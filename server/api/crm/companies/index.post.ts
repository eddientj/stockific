export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const body = await readJsonBody<Record<string, unknown>>(event)

  const name     = requireString(body, 'name', 200)
  const industry = optionalString(body, 'industry', 100)
  const website  = optionalString(body, 'website', 500)
  const phone    = optionalString(body, 'phone', 50)
  const email    = optionalString(body, 'email', 500)
  const address  = optionalString(body, 'address', 500)
  const notes    = optionalString(body, 'notes', 2000)

  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('companies')
    .insert({ org_id: orgId, name, industry, website, phone, email, address, notes })
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
