export type OrgTier = 'trial' | 'pro' | 'premium' | 'ultimate'

export interface OrgMe {
  tier: OrgTier
  trial_expires_at: string | null
  features: {
    crm: boolean
    batchTracking: boolean
    dataExport: boolean
    catalog: boolean
  }
  quotas: {
    products: { limit: number | null; used: number }
    invoices: { limit: number | null; used_this_month: number }
    orders:   { limit: number | null; used_this_month: number }
  }
}

export function useOrg() {
  const { data, refresh } = useFetch<OrgMe>('/api/org/me', { key: 'org-me' })

  const tier = computed((): OrgTier => data.value?.tier ?? 'trial')

  function canAccess(feature: keyof OrgMe['features']): boolean {
    return data.value?.features?.[feature] ?? false
  }

  const trialDaysLeft = computed((): number | null => {
    const exp = data.value?.trial_expires_at
    if (!exp) return null
    return Math.max(0, Math.ceil((new Date(exp).getTime() - Date.now()) / 86_400_000))
  })

  return { org: data, tier, canAccess, trialDaysLeft, refresh }
}
