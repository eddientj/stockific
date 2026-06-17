<script setup lang="ts">
import { useOrders, ORDER_STATUS_CFG, buildOrderTimeline, orderItemWarning } from '~/composables/useOrders'
import type { Order, OrderStatus } from '~/composables/useOrders'
import type { CustomerRow, ProductRow } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const toast = useAppToast()

const router = useRouter()

const {
  orders,
  search, statusFilter, filtered, pending,
  countByStatus, totalRevenue,
  selected, slideOpen, openDetail,
  advanceStatus, cancelOrder, createOrder, updateOrder, advancing,
  orderTotal, rm,
} = useOrders()

const creatingInvoice = ref(false)

async function createInvoice(orderId: string) {
  creatingInvoice.value = true
  try {
    const { id } = await $fetch<{ id: string; invoice_number: string }>(`/api/orders/${orderId}/invoice`, { method: 'POST' })
    slideOpen.value = false
    await router.push(`/admin/invoices/${id}`)
  } catch (e: any) {
    toast.add({ title: 'Failed to create invoice', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    creatingInvoice.value = false
  }
}

// ── Status chips ──────────────────────────────────────────────
const statusChips = computed(() =>
  (Object.keys(ORDER_STATUS_CFG) as OrderStatus[]).map(key => ({
    key,
    label: t(`status.${key.toLowerCase()}`),
    count: countByStatus.value[key],
    color: ORDER_STATUS_CFG[key].color,
    bg:    ORDER_STATUS_CFG[key].bg,
  }))
)

const selectedTimeline = computed(() =>
  selected.value ? buildOrderTimeline(selected.value.status) : []
)

// ── Create order ──────────────────────────────────────────────
const CREATE_CUSTOMER_FIELDS = computed<FieldDef[]>(() => [
  { name: 'customer_name',     label: t('field.name'),     type: 'text',  required: true, placeholder: 'Full name' },
  { name: 'customer_email',    label: t('field.email'),    type: 'email', placeholder: 'email@example.com' },
  { name: 'customer_phone',    label: t('field.phone'),    type: 'phone' },
  { name: 'customer_city',     label: t('field.city'),     type: 'text',  placeholder: 'Kuala Lumpur' },
  { name: 'customer_address',  label: t('field.address'),  type: 'text',  placeholder: 'Street address' },
  { name: 'customer_postcode', label: t('field.postcode'), type: 'text',  placeholder: '50000' },
])

const createModalOpen = ref(false)
const creating        = ref(false)
const orderMode       = ref<'create' | 'edit'>('create')
const editOrderId     = ref<string | null>(null)
const saveAsCustomer  = ref(false)

const { data: orderCustomers } = useLazyFetch<CustomerRow[]>('/api/customers', { key: 'order-customers' })
const { data: orderProducts  } = useLazyFetch<ProductRow[]>('/api/products',   { key: 'order-products'  })

const selectedCustomerId = ref<string | undefined>()
const selectedCustomer   = computed(() =>
  orderCustomers.value?.find(c => c.id === selectedCustomerId.value) ?? null
)

const DEFAULT_FORM = () => ({
  customer_name: '', customer_email: '', customer_phone: '',
  customer_address: '', customer_city: '', customer_postcode: '',
  shipping: 0, notes: '',
})

const createForm = ref<Record<string, any>>(DEFAULT_FORM())

watch(selectedCustomer, (c) => {
  if (!c) return
  createForm.value = {
    ...createForm.value,
    customer_name:     c.name,
    customer_email:    c.email    ?? '',
    customer_phone:    c.phone    ?? '',
    customer_address:  c.address  ?? '',
    customer_city:     c.city     ?? '',
    customer_postcode: c.postcode ?? '',
  }
})

// Clear save-as-customer when an existing customer is picked
watch(selectedCustomerId, (id) => { if (id) saveAsCustomer.value = false })

// Reset mode when slideover closes
watch(createModalOpen, (v) => {
  if (!v) {
    orderMode.value      = 'create'
    editOrderId.value    = null
    saveAsCustomer.value = false
  }
})

function openCreate() {
  orderMode.value          = 'create'
  editOrderId.value        = null
  selectedCustomerId.value = undefined
  createForm.value         = DEFAULT_FORM()
  orderItems.value         = []
  createModalOpen.value    = true
}

function openEdit(order: Order) {
  orderMode.value          = 'edit'
  editOrderId.value        = order.id
  selectedCustomerId.value = order.customer_id ?? undefined
  createForm.value = {
    customer_name:     order.customer_name,
    customer_email:    order.customer_email    ?? '',
    customer_phone:    order.customer_phone    ?? '',
    customer_address:  order.customer_address  ?? '',
    customer_city:     order.customer_city     ?? '',
    customer_postcode: order.customer_postcode ?? '',
    shipping:          order.shipping,
    notes:             order.notes ?? '',
  }
  orderItems.value = order.order_items.map(i => ({
    _key:       _itemKey++,
    name:       i.name,
    variant:    i.variant ?? '',
    qty:        i.qty,
    price:      i.price,
    product_id: i.product_id,
    variant_id: i.variant_id,
  }))
  createModalOpen.value = true
}

// ── Line items ────────────────────────────────────────────────
type LineItem = { _key: number; name: string; variant: string; qty: number; price: number; product_id: string | null; variant_id: string | null }
let _itemKey = 0
const orderItems = ref<LineItem[]>([])

// Available stock helper (used in product picker labels)
function productAvailable(p: any): number {
  return (p.variants ?? []).reduce((s: number, v: any) => s + (v.stock_quantity - v.stock_on_hold), 0)
}

function addCustomItem() {
  orderItems.value.push({ _key: _itemKey++, name: '', variant: '', qty: 1, price: 0, product_id: null, variant_id: null })
}

function addFromProduct(productId: string) {
  const p = orderProducts.value?.find(x => x.id === productId)
  if (!p) return
  orderItems.value.push({ _key: _itemKey++, name: p.name, variant: '', qty: 1, price: p.price, product_id: p.id, variant_id: null })
  productPickerOpen.value = false
  productPickerId.value   = undefined
}

function removeItem(k: number) {
  orderItems.value = orderItems.value.filter(i => i._key !== k)
}

const productPickerOpen = ref(false)
const productPickerId   = ref<string | undefined>()

const createSubtotal = computed(() => orderItems.value.reduce((s, i) => s + i.qty * i.price, 0))
const createTotal    = computed(() => createSubtotal.value + Number(createForm.value.shipping ?? 0))

async function submitOrder() {
  if (!createForm.value.customer_name.trim()) {
    toast.add({ title: 'Customer name is required', color: 'error' })
    return
  }
  const validItems = orderItems.value.filter(i => i.name.trim())
  if (!validItems.length) {
    toast.add({ title: 'Add at least one item', color: 'error' })
    return
  }

  const itemPayload = validItems.map(i => ({
    name:       i.name.trim(),
    variant:    i.variant.trim() || null,
    qty:        i.qty,
    price:      i.price,
    product_id: i.product_id ?? null,
    variant_id: i.variant_id ?? null,
  }))

  creating.value = true
  try {
    if (orderMode.value === 'edit') {
      // ── Edit existing order ────────────────────────────
      const updated = await updateOrder(editOrderId.value!, {
        customer_id:       selectedCustomerId.value ?? null,
        customer_name:     createForm.value.customer_name,
        customer_email:    createForm.value.customer_email    || null,
        customer_phone:    createForm.value.customer_phone    || null,
        customer_address:  createForm.value.customer_address  || null,
        customer_city:     createForm.value.customer_city     || null,
        customer_postcode: createForm.value.customer_postcode || null,
        shipping:          Number(createForm.value.shipping),
        notes:             createForm.value.notes || null,
        items:             itemPayload,
      })
      toast.add({ title: 'Order updated', color: 'success', icon: 'i-lucide-check' })
      createModalOpen.value = false
      selected.value = updated

    } else {
      // ── Create new order (optionally saving customer) ──
      let customerId = selectedCustomerId.value ?? null
      if (!customerId && saveAsCustomer.value && createForm.value.customer_name.trim()) {
        const newCustomer = await $fetch<CustomerRow>('/api/customers', {
          method: 'POST',
          body: {
            name:     createForm.value.customer_name.trim(),
            email:    createForm.value.customer_email    || null,
            phone:    createForm.value.customer_phone    || null,
            address:  createForm.value.customer_address  || null,
            city:     createForm.value.customer_city     || null,
            postcode: createForm.value.customer_postcode || null,
          },
        })
        customerId = newCustomer.id
        if (orderCustomers.value) orderCustomers.value = [newCustomer, ...orderCustomers.value]
      }

      const order = await createOrder({
        customer_id:       customerId,
        customer_name:     createForm.value.customer_name,
        customer_email:    createForm.value.customer_email    || null,
        customer_phone:    createForm.value.customer_phone    || null,
        customer_address:  createForm.value.customer_address  || null,
        customer_city:     createForm.value.customer_city     || null,
        customer_postcode: createForm.value.customer_postcode || null,
        shipping:          Number(createForm.value.shipping),
        notes:             createForm.value.notes || null,
        items:             itemPayload,
      })
      toast.add({ title: `Order ${order.order_number} created`, color: 'success', icon: 'i-lucide-check' })
      createModalOpen.value = false
      selected.value  = order
      slideOpen.value = true
    }
  } catch (e: any) {
    toast.add({
      title: orderMode.value === 'edit' ? 'Failed to update order' : 'Failed to create order',
      description: e?.data?.statusMessage ?? e?.message,
      color: 'error',
    })
  } finally {
    creating.value = false
  }
}
</script>

<template>
  <section class="space-y-6">

    <AppPageHeader :title="t('ord.title')" :description="t('ord.subtitle')">
      <template #actions>
        <UButton icon="i-lucide-package-plus" @click="openCreate">{{ t('ord.new') }}</UButton>
      </template>
    </AppPageHeader>

    <AppStatusChips v-model="statusFilter" :chips="statusChips" />

    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <UInput v-model="search" icon="i-lucide-search" :placeholder="t('ord.search')" class="w-full sm:w-72" />
      <div class="flex items-center gap-2">
        <span class="text-sm text-(--ui-text-muted)">{{ filtered.length }} {{ t('ord.ordersLabel') }}</span>
        <UButton v-if="statusFilter !== 'all'" size="xs" variant="soft" color="neutral" icon="i-lucide-x" @click="statusFilter = 'all'">
          {{ t('ord.clearFilter') }}
        </UButton>
      </div>
    </div>

    <AppListTable :row-count="filtered.length">
      <template #head>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap">{{ t('ord.colOrder') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">{{ t('ord.colCustomer') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap hidden sm:table-cell">{{ t('ord.colDate') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) hidden md:table-cell">{{ t('ord.colItems') }}</th>
        <th class="text-right px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap">{{ t('ord.colAmount') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">{{ t('ord.colStatus') }}</th>
        <th class="px-4 py-3 w-10" />
      </template>

      <tr
        v-for="o in filtered"
        :key="o.id"
        class="border-b border-(--ui-border) last:border-0 hover:bg-(--ui-bg-elevated) transition-colors cursor-pointer"
        @click="openDetail(o)"
      >
        <td class="px-4 py-3">
          <span class="font-mono text-xs font-semibold text-(--ui-text-highlighted)">{{ o.order_number }}</span>
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
              <span class="text-[10px] font-bold text-(--ui-text-muted)">
                {{ o.customer_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) }}
              </span>
            </div>
            <div class="min-w-0">
              <p class="font-medium text-(--ui-text-highlighted) truncate leading-tight">{{ o.customer_name }}</p>
              <p v-if="o.customer_email" class="text-xs text-(--ui-text-muted) truncate">{{ o.customer_email }}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 text-(--ui-text-muted) whitespace-nowrap hidden sm:table-cell">{{ o.created_at.slice(0, 10) }}</td>
        <td class="px-4 py-3 hidden md:table-cell">
          <div class="flex items-center gap-1.5">
            <span class="text-(--ui-text-muted)">
              {{ o.order_items.reduce((s, i) => s + i.qty, 0) }} item{{ o.order_items.reduce((s, i) => s + i.qty, 0) !== 1 ? 's' : '' }}
            </span>
            <UTooltip v-if="o.order_items.some(i => orderItemWarning(i))" :text="o.order_items.filter(i => orderItemWarning(i)).map(i => orderItemWarning(i)).join(', ')">
              <UIcon name="i-lucide-alert-triangle" class="size-3.5 text-amber-500 shrink-0" />
            </UTooltip>
          </div>
        </td>
        <td class="px-4 py-3 text-right font-semibold text-(--ui-text-highlighted) whitespace-nowrap">{{ rm(orderTotal(o)) }}</td>
        <td class="px-4 py-3">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            :class="[ORDER_STATUS_CFG[o.status].color, ORDER_STATUS_CFG[o.status].bg]"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="ORDER_STATUS_CFG[o.status].dot" />
            {{ t('status.' + o.status.toLowerCase()) }}
          </span>
        </td>
        <td class="px-4 py-3">
          <UIcon name="i-lucide-chevron-right" class="size-4 text-(--ui-text-muted)" />
        </td>
      </tr>

      <template #empty>
        <div class="py-16 text-center">
          <UIcon name="i-lucide-package" class="size-10 text-(--ui-text-muted) mx-auto mb-3" />
          <p class="font-medium text-(--ui-text-highlighted)">
            {{ pending ? t('ord.loading') : t('ord.noOrders') }}
          </p>
          <p v-if="!pending" class="text-sm text-(--ui-text-muted) mt-1">
            {{ statusFilter !== 'all' ? t('ord.noOrdersFilter') : t('ord.noOrdersEmpty') }}
          </p>
        </div>
      </template>
    </AppListTable>

    <p class="text-xs text-(--ui-text-muted) text-right">
      {{ t('ord.totalRevenue') }} <span class="font-semibold text-(--ui-text-highlighted)">{{ rm(totalRevenue) }}</span>
    </p>

    <!-- ── Order detail slideover ─────────────────────────────── -->
    <USlideover v-model:open="slideOpen" side="right" class="max-w-lg">
      <template #content>
        <div v-if="selected" class="flex flex-col h-full overflow-y-auto">

          <div class="px-6 py-5 border-b border-(--ui-border) flex items-start justify-between gap-4 shrink-0">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-sm font-bold text-(--ui-text-highlighted)">{{ selected.order_number }}</span>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                  :class="[ORDER_STATUS_CFG[selected.status].color, ORDER_STATUS_CFG[selected.status].bg]"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="ORDER_STATUS_CFG[selected.status].dot" />
                  {{ t('status.' + selected.status.toLowerCase()) }}
                </span>
              </div>
              <p class="text-sm text-(--ui-text-muted)">{{ t('ord.placedOn') }} {{ selected.created_at.slice(0, 10) }}</p>
            </div>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="slideOpen = false" />
          </div>

          <div class="flex-1 px-6 py-5 space-y-6">

            <!-- Timeline -->
            <div>
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">{{ t('ord.progress') }}</p>
              <div class="flex items-center">
                <template v-for="(step, i) in selectedTimeline" :key="step.label">
                  <div class="flex flex-col items-center gap-1 flex-1">
                    <div
                      class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors"
                      :class="step.done
                        ? (selected.status === 'Cancelled' && i === 1 ? 'bg-red-500 border-red-500' : 'bg-indigo-500 border-indigo-500')
                        : 'bg-(--ui-bg) border-(--ui-border)'"
                    >
                      <UIcon :name="step.icon" class="size-3.5" :class="step.done ? 'text-white' : 'text-(--ui-text-muted)'" />
                    </div>
                    <span class="text-[10px] text-center leading-tight" :class="step.done ? 'text-(--ui-text-highlighted) font-medium' : 'text-(--ui-text-muted)'">
                      {{ step.label }}
                    </span>
                  </div>
                  <div
                    v-if="i < selectedTimeline.length - 1"
                    class="h-0.5 flex-1 mb-5 rounded-full"
                    :class="selectedTimeline[i + 1]?.done ? 'bg-indigo-500' : 'bg-(--ui-border)'"
                  />
                </template>
              </div>
            </div>

            <!-- Customer -->
            <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) p-4 space-y-2">
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">{{ t('invf.customer') }}</p>
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-(--ui-bg) border border-(--ui-border) flex items-center justify-center shrink-0">
                  <span class="text-xs font-bold text-(--ui-text-muted)">
                    {{ selected.customer_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2) }}
                  </span>
                </div>
                <div>
                  <p class="font-semibold text-(--ui-text-highlighted)">{{ selected.customer_name }}</p>
                  <p v-if="selected.customer_email" class="text-xs text-(--ui-text-muted)">{{ selected.customer_email }}</p>
                </div>
              </div>
              <div v-if="selected.customer_phone" class="flex items-center gap-2 pt-1">
                <UIcon name="i-lucide-phone" class="size-3.5 text-(--ui-text-muted)" />
                <span class="text-sm text-(--ui-text-muted)">{{ selected.customer_phone }}</span>
              </div>
              <div v-if="selected.customer_address" class="flex items-start gap-2">
                <UIcon name="i-lucide-map-pin" class="size-3.5 text-(--ui-text-muted) mt-0.5" />
                <span class="text-sm text-(--ui-text-muted)">
                  {{ selected.customer_address }}{{ selected.customer_city ? ', ' + selected.customer_city : '' }}{{ selected.customer_postcode ? ', ' + selected.customer_postcode : '' }}
                </span>
              </div>
              <div v-if="selected.notes" class="flex items-start gap-2 pt-1 border-t border-(--ui-border) mt-2">
                <UIcon name="i-lucide-message-square" class="size-3.5 text-(--ui-text-muted) mt-0.5 shrink-0" />
                <span class="text-sm text-(--ui-text-muted) italic">{{ selected.notes }}</span>
              </div>
            </div>

            <!-- Items -->
            <div>
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">{{ t('ord.colItems') }}</p>
              <div class="rounded-xl border border-(--ui-border) overflow-hidden">
                <div v-for="(item, idx) in selected.order_items" :key="item.id ?? idx" class="flex items-center gap-3 px-4 py-3 border-b border-(--ui-border) last:border-0">
                  <div class="w-9 h-9 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-package" class="size-4 text-(--ui-text-muted)" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ item.name }}</p>
                      <UBadge v-if="orderItemWarning(item)" :label="orderItemWarning(item)!" color="warning" variant="subtle" size="xs" />
                    </div>
                    <p v-if="item.variant" class="text-xs text-(--ui-text-muted)">{{ item.variant }} · qty {{ item.qty }}</p>
                    <p v-else class="text-xs text-(--ui-text-muted)">qty {{ item.qty }}</p>
                  </div>
                  <p class="text-sm font-semibold text-(--ui-text-highlighted) whitespace-nowrap">{{ rm(item.price * item.qty) }}</p>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) divide-y divide-(--ui-border)">
              <div class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-(--ui-text-muted)">{{ t('ord.subtotal') }}</span>
                <span class="text-(--ui-text-highlighted)">{{ rm(selected.order_items.reduce((s, i) => s + i.price * i.qty, 0)) }}</span>
              </div>
              <div class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-(--ui-text-muted)">{{ t('ord.shipping') }}</span>
                <span :class="selected.shipping === 0 ? 'text-indigo-500 font-medium' : 'text-(--ui-text-highlighted)'">
                  {{ selected.shipping === 0 ? t('ord.free') : rm(selected.shipping) }}
                </span>
              </div>
              <div class="flex justify-between px-4 py-3 font-semibold">
                <span class="text-(--ui-text-highlighted)">{{ t('ord.total') }}</span>
                <span class="text-indigo-500">{{ rm(orderTotal(selected)) }}</span>
              </div>
            </div>

          </div>

          <div class="px-6 py-4 border-t border-(--ui-border) flex flex-col gap-2 shrink-0">
            <div class="flex gap-3">
              <UButton v-if="selected.status === 'Pending'" icon="i-lucide-pencil" variant="outline" color="neutral" size="sm" @click="openEdit(selected)">{{ t('action.edit') }}</UButton>
              <template v-if="selected.status !== 'Cancelled' && selected.status !== 'Delivered'">
                <UButton icon="i-lucide-check-circle" class="flex-1" :loading="advancing === selected.id" @click="advanceStatus(selected.id)">
                  {{ selected.status === 'Pending' ? t('ord.confirmOrder') : selected.status === 'Confirmed' ? t('ord.markShipped') : t('ord.markDelivered') }}
                </UButton>
                <UButton variant="outline" color="error" icon="i-lucide-ban" :loading="advancing === selected.id" @click="cancelOrder(selected.id)">
                  {{ t('action.cancel') }}
                </UButton>
              </template>
              <UButton v-if="selected.status === 'Delivered'" icon="i-lucide-check" class="flex-1" variant="soft" color="success" disabled>{{ t('status.delivered') }}</UButton>
              <UButton v-if="selected.status === 'Cancelled'" icon="i-lucide-ban" class="flex-1" variant="soft" color="error" disabled>{{ t('status.cancelled') }}</UButton>
            </div>
            <UButton
              v-if="selected.status !== 'Pending' && selected.status !== 'Cancelled'"
              icon="i-lucide-file-text"
              variant="outline"
              color="neutral"
              class="w-full"
              :loading="creatingInvoice"
              @click="createInvoice(selected.id)"
            >
              {{ t('ord.createInvoice') }}
            </UButton>
          </div>

        </div>
      </template>
    </USlideover>

    <!-- ── Create order slideover ─────────────────────────────── -->
    <AppFormSlideover
      :title="orderMode === 'edit' ? t('ord.editOrder') : t('ord.newOrder')"
      :fields="CREATE_CUSTOMER_FIELDS"
      v-model="createForm"
      v-model:open="createModalOpen"
      :loading="creating"
      :save-label="orderMode === 'edit' ? t('action.save') : t('ord.createOrder')"
      @save="submitOrder"
    >
      <template #before>
        <div class="space-y-2">
          <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('invf.customer') }}</p>
          <USelectMenu
            v-model="selectedCustomerId"
            :items="(orderCustomers ?? []).map(c => ({ label: c.name, value: c.id, description: c.email ?? '' }))"
            value-key="value"
            :placeholder="t('ord.quickFill')"
            option-attribute="label"
            class="w-full"
          />
          <div v-if="orderMode === 'create' && !selectedCustomerId && createForm.customer_name" class="pt-1">
            <UCheckbox v-model="saveAsCustomer" :label="t('ord.saveNewCust')" />
          </div>
        </div>
      </template>

      <!-- Items section -->
      <div class="space-y-3">
        <div class="h-px bg-(--ui-border)" />
        <p class="text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('ord.colItems') }}</p>

        <div
          v-for="(item, idx) in orderItems"
          :key="item._key"
          class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-3 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-(--ui-text-muted)">{{ t('ord.item') }} {{ idx + 1 }}</span>
            <button class="text-(--ui-text-muted) hover:text-red-500 transition-colors" @click="removeItem(item._key)">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <UFormField label="Name">
              <UInput v-model="item.name" placeholder="Item name" size="sm" class="w-full" />
            </UFormField>
            <UFormField label="Variant">
              <UInput v-model="item.variant" placeholder="e.g. Size M" size="sm" class="w-full" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <AppField
              :field="{ name: 'qty', label: 'Qty', type: 'number', min: 1 }"
              :model-value="item.qty"
              @update:model-value="item.qty = $event"
            />
            <AppField
              :field="{ name: 'price', label: 'Unit price (RM)', type: 'number', min: 0, decimals: 2, mono: true }"
              :model-value="item.price"
              @update:model-value="item.price = $event"
            />
          </div>
        </div>

        <div v-if="!orderItems.length" class="rounded-lg border border-dashed border-(--ui-border) py-6 text-center">
          <p class="text-sm text-(--ui-text-muted)">{{ t('ord.noItems') }}</p>
        </div>

        <div class="flex gap-2">
          <UButton icon="i-lucide-package-search" variant="outline" color="neutral" size="sm" class="flex-1" @click="productPickerOpen = true">
            {{ t('ord.fromProduct') }}
          </UButton>
          <UButton icon="i-lucide-plus" variant="outline" color="neutral" size="sm" class="flex-1" @click="addCustomItem">
            {{ t('ord.customItem') }}
          </UButton>
        </div>

        <div v-if="productPickerOpen" class="rounded-lg border border-(--ui-border) bg-(--ui-bg) p-3 space-y-2">
          <div class="flex items-center justify-between mb-1">
            <p class="text-xs font-medium text-(--ui-text-muted)">{{ t('ord.selectProduct') }}</p>
            <button class="text-(--ui-text-muted) hover:text-red-500" @click="productPickerOpen = false">
              <UIcon name="i-lucide-x" class="size-3.5" />
            </button>
          </div>
          <USelectMenu
            v-model="productPickerId"
            :items="(orderProducts ?? []).filter(p => p.is_active).map(p => ({
              label: p.name,
              value: p.id,
              description: `RM ${p.price.toFixed(2)} · ${productAvailable(p) > 0 ? productAvailable(p) + ' in stock' : 'Out of stock'}`,
            }))"
            value-key="value"
            option-attribute="label"
            :placeholder="t('ord.searchProds')"
            class="w-full"
            @update:model-value="addFromProduct"
          />
        </div>

        <div class="h-px bg-(--ui-border)" />

        <div class="grid grid-cols-2 gap-4">
          <AppField
            :field="{ name: 'shipping', label: 'Shipping (RM)', type: 'number', min: 0, decimals: 2, placeholder: '0.00', mono: true }"
            :model-value="createForm.shipping"
            @update:model-value="createForm.shipping = $event"
          />
          <AppField
            :field="{ name: 'notes', label: 'Notes', type: 'text', placeholder: 'Delivery instructions…' }"
            :model-value="createForm.notes"
            @update:model-value="createForm.notes = $event"
          />
        </div>

        <div class="rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) px-4 py-3 flex items-center justify-between">
          <div class="text-xs text-(--ui-text-muted) space-y-0.5">
            <p>{{ t('ord.subtotal') }}: <span class="font-mono text-(--ui-text-highlighted)">RM {{ createSubtotal.toFixed(2) }}</span></p>
            <p v-if="Number(createForm.shipping) > 0">{{ t('ord.shipping') }}: <span class="font-mono text-(--ui-text-highlighted)">RM {{ Number(createForm.shipping).toFixed(2) }}</span></p>
          </div>
          <div class="text-right">
            <p class="text-xs text-(--ui-text-muted)">{{ t('ord.total') }}</p>
            <p class="font-mono font-bold text-lg text-indigo-500">RM {{ createTotal.toFixed(2) }}</p>
          </div>
        </div>
      </div>
    </AppFormSlideover>

  </section>
</template>
