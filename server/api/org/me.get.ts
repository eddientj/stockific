export default defineEventHandler(async (event) => {
  const { orgId } = await requireAuth(event)
  const supabase = useSupabaseAdmin()

  const { data: org } = await supabase
    .from('organisations')
    .select('tier, trial_expires_at')
    .eq('id', orgId)
    .single()

  const rawTier = org?.tier ?? 'trial'
  const tier = (Object.keys(TIER_LIMITS).includes(rawTier) ? rawTier : 'trial') as OrgTier

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  const monthISO = monthStart.toISOString()

  const [productRes, invoiceRes, orderRes] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('org_id', orgId),
    supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', monthISO),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('org_id', orgId).gte('created_at', monthISO),
  ])

  return {
    tier,
    trial_expires_at: org?.trial_expires_at ?? null,
    features: TIER_FEATURES[tier],
    quotas: {
      products: { limit: TIER_LIMITS[tier].products,          used: productRes.count ?? 0 },
      invoices: { limit: TIER_LIMITS[tier].invoices_monthly,  used_this_month: invoiceRes.count ?? 0 },
      orders:   { limit: TIER_LIMITS[tier].orders_monthly,    used_this_month: orderRes.count ?? 0 },
    },
  }
})
