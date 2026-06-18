import type { CompanyRow } from '~/types'

export function useCompanies() {
  const toast = useAppToast()

  const { data: companies, pending, refresh } =
    useFetch<CompanyRow[]>('/api/crm/companies')

  async function createCompany(payload: Partial<CompanyRow>) {
    await $fetch('/api/crm/companies', { method: 'POST', body: payload })
    toast.success('Company created')
    await refresh()
  }

  async function updateCompany(id: string, payload: Partial<CompanyRow>) {
    await $fetch(`/api/crm/companies/${id}`, { method: 'PATCH', body: payload })
    toast.success('Company updated')
    await refresh()
  }

  async function deleteCompany(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return false
    await $fetch(`/api/crm/companies/${id}`, { method: 'DELETE' })
    toast.success('Company deleted')
    await refresh()
    return true
  }

  return { companies, pending, refresh, createCompany, updateCompany, deleteCompany }
}
