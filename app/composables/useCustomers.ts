import type { CustomerRow, CustomerPayload } from '~/types'

export function useCustomers() {
  const toast = useAppToast()

  const { data: customers, pending, refresh } =
    useFetch<CustomerRow[]>('/api/customers')

  // ── CRUD ──────────────────────────────────────────────────────
  async function createCustomer(payload: CustomerPayload) {
    await $fetch('/api/customers', { method: 'POST', body: payload })
    toast.add({ title: 'Customer created', color: 'success', icon: 'i-lucide-check' })
    await refresh()
  }

  async function updateCustomer(id: string, payload: Partial<CustomerPayload>) {
    await $fetch(`/api/customers/${id}`, { method: 'PATCH', body: payload })
    toast.add({ title: 'Customer updated', color: 'success', icon: 'i-lucide-check' })
    await refresh()
  }

  async function deleteCustomer(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return false
    await $fetch(`/api/customers/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Customer deleted', color: 'success', icon: 'i-lucide-check' })
    await refresh()
    return true
  }

  // ── Helper: initials avatar ────────────────────────────────────
  function initials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  }

  return {
    customers,
    pending,
    refresh,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    initials,
  }
}
