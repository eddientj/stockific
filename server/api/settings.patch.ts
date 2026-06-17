export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase  = useSupabaseAdmin()
  const body      = await readBody(event)

  const allowed = [
    'company_name', 'reg_number', 'email', 'phone', 'website',
    'address', 'city', 'postcode', 'country',
    'logo_url', 'accent_color',
    'invoice_prefix', 'default_tax_rate', 'default_payment_terms', 'invoice_notes',
    'bank_name', 'bank_account', 'bank_holder', 'duitnow_id',
  ]
  const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

  const { data, error } = await supabase
    .from('business_settings')
    .update(patch)
    .eq('org_id', orgId)
    .select()
    .single()

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data
})
