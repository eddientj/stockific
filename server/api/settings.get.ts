export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase = useSupabaseAdmin()
  const { data, error } = await supabase
    .from('business_settings')
    .select('*')
    .eq('org_id', orgId)
    .maybeSingle()
  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? {
    org_id: orgId, company_name: 'My Business', country: 'Malaysia',
    accent_color: '#6366f1', invoice_prefix: 'INV', default_tax_rate: 6,
    default_payment_terms: '30 days',
  }
})
