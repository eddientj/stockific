import type { LeadRow } from '~/types'

export function useLeads(params?: Ref<Record<string, string>>) {
  const toast = useAppToast()

  const { data, pending, refresh } = useFetch<{ data: LeadRow[]; total: number; page: number; limit: number }>(
    '/api/crm/leads',
    { query: params },
  )

  const leads = computed(() => data.value?.data ?? [])
  const total = computed(() => data.value?.total ?? 0)

  async function createLead(payload: Record<string, unknown>) {
    const result = await $fetch<LeadRow>('/api/crm/leads', { method: 'POST', body: payload })
    toast.success('Lead created')
    await refresh()
    return result
  }

  async function updateLead(id: string, payload: Record<string, unknown>) {
    const result = await $fetch<LeadRow>(`/api/crm/leads/${id}`, { method: 'PATCH', body: payload })
    toast.success('Lead updated')
    await refresh()
    return result
  }

  async function deleteLead(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return false
    await $fetch(`/api/crm/leads/${id}`, { method: 'DELETE' })
    toast.success('Lead deleted')
    await refresh()
    return true
  }

  async function convertLead(id: string) {
    const result = await $fetch<{ order_id: string; order_number: string }>(
      `/api/crm/leads/${id}/convert`,
      { method: 'POST' },
    )
    toast.success('Lead converted to order')
    await refresh()
    return result
  }

  return { leads, total, pending, refresh, createLead, updateLead, deleteLead, convertLead }
}
