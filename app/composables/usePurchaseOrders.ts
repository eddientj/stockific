import type { PurchaseOrderRow, PurchaseOrderDetail, PurchaseOrderItem } from '~/types'

export function usePurchaseOrders() {
  const toast = useAppToast()

  const { data: orders, pending, refresh } = useFetch<PurchaseOrderRow[]>('/api/purchase-orders')

  async function createOrder(body: Partial<PurchaseOrderRow>) {
    const data = await $fetch<PurchaseOrderRow>('/api/purchase-orders', { method: 'POST', body })
    toast.success(`${data.po_number} created`)
    await refresh()
    return data
  }

  async function updateOrder(id: string, body: Partial<PurchaseOrderRow>) {
    const data = await $fetch<PurchaseOrderRow>(`/api/purchase-orders/${id}`, { method: 'PATCH', body })
    await refresh()
    return data
  }

  return { orders, pending, refresh, createOrder, updateOrder }
}

export function usePurchaseOrder(id: string) {
  const toast = useAppToast()

  const { data: po, pending, refresh } = useFetch<PurchaseOrderDetail>(`/api/purchase-orders/${id}`)

  async function addItem(body: Partial<PurchaseOrderItem>) {
    await $fetch(`/api/purchase-orders/${id}/items`, { method: 'POST', body })
    toast.success('Item added')
    await refresh()
  }

  async function removeItem(itemId: string) {
    await $fetch(`/api/purchase-orders/${id}/items/${itemId}`, { method: 'DELETE' })
    await refresh()
  }

  async function updateStatus(status: string) {
    await $fetch(`/api/purchase-orders/${id}`, { method: 'PATCH', body: { status } })
    toast.success('Status updated')
    await refresh()
  }

  async function receiveGoods(items: { poi_id: string; qty: number }[]) {
    await $fetch(`/api/purchase-orders/${id}/receive`, { method: 'POST', body: { items } })
    toast.success('Stock updated')
    await refresh()
  }

  return { po, pending, refresh, addItem, removeItem, updateStatus, receiveGoods }
}
