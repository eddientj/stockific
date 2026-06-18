import type { SupplierRow } from '~/types'

export function useSuppliers() {
  const toast = useAppToast()

  const { data: suppliers, pending, refresh } = useFetch<SupplierRow[]>('/api/suppliers')

  async function createSupplier(body: Partial<SupplierRow>) {
    const data = await $fetch<SupplierRow>('/api/suppliers', { method: 'POST', body })
    toast.success('Supplier created')
    await refresh()
    return data
  }

  async function updateSupplier(id: string, body: Partial<SupplierRow>) {
    const data = await $fetch<SupplierRow>(`/api/suppliers/${id}`, { method: 'PATCH', body })
    toast.success('Supplier updated')
    await refresh()
    return data
  }

  async function deleteSupplier(id: string, name: string) {
    await $fetch(`/api/suppliers/${id}`, { method: 'DELETE' })
    toast.success(`"${name}" deleted`)
    await refresh()
  }

  return { suppliers, pending, refresh, createSupplier, updateSupplier, deleteSupplier }
}
