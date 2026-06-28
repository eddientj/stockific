export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, 'token')
  if (!token) throw createError({ statusCode: 400, statusMessage: 'Missing token' })

  const supabase = useSupabaseAdmin()

  const { data: inv, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(*), customers(name, email, phone, address)')
    .eq('share_token', token)
    .single()

  if (error || !inv) throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })

  // Fetch org branding so the public page can show the business header
  const { data: settings } = await supabase
    .from('business_settings')
    .select('company_name, email, phone, address, city, postcode, country, logo_url, accent_color, bank_name, bank_account, bank_holder, duitnow_id, invoice_prefix')
    .eq('org_id', inv.org_id)
    .single()

  return { invoice: inv, settings: settings ?? null }
})
