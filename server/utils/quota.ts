export type OrgTier = 'trial' | 'pro' | 'premium' | 'ultimate'

interface TierLimit {
  products: number | null
  invoices_monthly: number | null
  orders_monthly: number | null
}

interface TierFeatures {
  crm: boolean
  batchTracking: boolean
  dataExport: boolean
  catalog: boolean
}

export const TIER_LIMITS: Record<OrgTier, TierLimit> = {
  trial:    { products: 30,   invoices_monthly: 50,  orders_monthly: 20  },
  pro:      { products: 200,  invoices_monthly: 300, orders_monthly: 150 },
  premium:  { products: 1000, invoices_monthly: null, orders_monthly: null },
  ultimate: { products: null, invoices_monthly: null, orders_monthly: null },
}

export const TIER_FEATURES: Record<OrgTier, TierFeatures> = {
  trial:    { crm: false, batchTracking: false, dataExport: false, catalog: false },
  pro:      { crm: true,  batchTracking: false, dataExport: false, catalog: false },
  premium:  { crm: true,  batchTracking: true,  dataExport: true,  catalog: true  },
  ultimate: { crm: true,  batchTracking: true,  dataExport: true,  catalog: true  },
}

const VALID_TIERS = new Set<string>(['trial', 'pro', 'premium', 'ultimate'])

export async function requireFeature(orgId: string, feature: keyof TierFeatures): Promise<void> {
  const tier = await getOrgTier(orgId)
  if (!TIER_FEATURES[tier][feature]) {
    const label = feature.replace(/([A-Z])/g, ' $1').toLowerCase()
    throw createError({
      statusCode: 402,
      statusMessage: `${label} is not available on the ${tier} plan. Upgrade to access this feature.`,
    })
  }
}

export async function getOrgTier(orgId: string): Promise<OrgTier> {
  const supabase = useSupabaseAdmin()
  const { data } = await supabase
    .from('organisations')
    .select('tier')
    .eq('id', orgId)
    .single()
  const t = data?.tier ?? 'trial'
  return (VALID_TIERS.has(t) ? t : 'trial') as OrgTier
}

export async function checkProductQuota(orgId: string): Promise<void> {
  const tier = await getOrgTier(orgId)
  const limit = TIER_LIMITS[tier].products
  if (limit === null) return

  const supabase = useSupabaseAdmin()
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)

  if ((count ?? 0) >= limit) {
    throw createError({
      statusCode: 402,
      statusMessage: `Product limit reached (${limit} on ${tier} plan). Upgrade to add more products.`,
    })
  }
}

export async function checkInvoiceQuota(orgId: string): Promise<void> {
  const tier = await getOrgTier(orgId)
  const limit = TIER_LIMITS[tier].invoices_monthly
  if (limit === null) return

  const supabase = useSupabaseAdmin()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', monthStart.toISOString())

  if ((count ?? 0) >= limit) {
    throw createError({
      statusCode: 402,
      statusMessage: `Invoice limit reached (${limit}/month on ${tier} plan). Upgrade to create more invoices.`,
    })
  }
}

export async function checkOrderQuota(orgId: string): Promise<void> {
  const tier = await getOrgTier(orgId)
  const limit = TIER_LIMITS[tier].orders_monthly
  if (limit === null) return

  const supabase = useSupabaseAdmin()
  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', orgId)
    .gte('created_at', monthStart.toISOString())

  if ((count ?? 0) >= limit) {
    throw createError({
      statusCode: 402,
      statusMessage: `Order limit reached (${limit}/month on ${tier} plan). Upgrade to create more orders.`,
    })
  }
}
