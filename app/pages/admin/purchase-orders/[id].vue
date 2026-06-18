<script setup lang="ts">
import type { ProductRow, PurchaseOrderItem } from '~/types'

definePageMeta({ layout: 'admin' })

const route = useRoute()
const toast  = useAppToast()
const { po, pending, addItem, removeItem, updateStatus, receiveGoods } = usePurchaseOrder(route.params.id as string)

// ── Product picker for adding items ───────────────────────────
const { data: products } = useFetch<ProductRow[]>('/api/products')

const addOpen  = ref(false)
const addForm  = ref({ product_id: '', variant_id: '', qty_ordered: 1, unit_cost: 0 })
const addSaving = ref(false)

const selectedProduct = computed(() =>
  (products.value ?? []).find(p => p.id === addForm.value.product_id) ?? null
)
const variantOptions = computed(() =>
  (selectedProduct.value?.variants ?? []).map(v => ({
    label: v.name + (v.sku ? ` (${v.sku})` : ''),
    value: v.id,
  }))
)

watch(() => addForm.value.product_id, () => {
  addForm.value.variant_id = selectedProduct.value?.variants[0]?.id ?? ''
  const v = selectedProduct.value?.variants[0]
  addForm.value.unit_cost = 0
})

async function submitAddItem() {
  if (!addForm.value.product_id) return
  addSaving.value = true
  try {
    await addItem({
      product_id:  addForm.value.product_id,
      variant_id:  addForm.value.variant_id || null,
      qty_ordered: addForm.value.qty_ordered,
      unit_cost:   addForm.value.unit_cost,
    } as any)
    addOpen.value = false
    addForm.value = { product_id: '', variant_id: '', qty_ordered: 1, unit_cost: 0 }
  } catch (e: any) {
    toast.error('Failed to add item', e?.data?.statusMessage ?? e?.message)
  } finally {
    addSaving.value = false
  }
}

// ── Receive goods ─────────────────────────────────────────────
const receiveOpen = ref(false)
const receiveQtys = ref<Record<string, number>>({})
const receiving   = ref(false)

function openReceive() {
  receiveQtys.value = {}
  for (const item of po.value?.items ?? []) {
    const remaining = item.qty_ordered - item.qty_received
    if (remaining > 0) receiveQtys.value[item.id] = remaining
  }
  receiveOpen.value = true
}

async function submitReceive() {
  receiving.value = true
  try {
    const items = Object.entries(receiveQtys.value)
      .filter(([, qty]) => qty > 0)
      .map(([poi_id, qty]) => ({ poi_id, qty }))
    await receiveGoods(items)
    receiveOpen.value = false
  } catch (e: any) {
    toast.error('Failed to receive goods', e?.data?.statusMessage ?? e?.message)
  } finally {
    receiving.value = false
  }
}

// ── Status helpers ────────────────────────────────────────────
const STATUS_COLOR: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'neutral', ordered: 'info', partial: 'warning', received: 'success', cancelled: 'error',
}

const isEditable  = computed(() => po.value?.status === 'draft')
const canOrder    = computed(() => po.value?.status === 'draft' && (po.value?.items?.length ?? 0) > 0)
const canReceive  = computed(() => po.value?.status === 'ordered' || po.value?.status === 'partial')
const canCancel   = computed(() => po.value?.status !== 'received' && po.value?.status !== 'cancelled')

const totalCost = computed(() =>
  (po.value?.items ?? []).reduce((s, i) => s + i.qty_ordered * i.unit_cost, 0)
)

const rm = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`

const productOptions = computed(() =>
  (products.value ?? []).map(p => ({ label: p.name, value: p.id }))
)
</script>

<template>
  <div v-if="pending" class="flex justify-center py-20">
    <UIcon name="i-lucide-loader-circle" class="size-8 animate-spin text-(--ui-text-muted)" />
  </div>

  <section v-else-if="po" class="space-y-6">

    <!-- Header -->
    <div class="flex items-start justify-between">
      <div>
        <div class="flex items-center gap-3 mb-1">
          <NuxtLink to="/admin/purchase-orders" class="text-sm text-(--ui-text-muted) hover:text-indigo-500">
            ← Purchase Orders
          </NuxtLink>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-(--ui-text-highlighted) flex items-center gap-3">
          {{ po.po_number }}
          <UBadge :color="STATUS_COLOR[po.status]" variant="subtle" class="capitalize">{{ po.status }}</UBadge>
        </h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">
          {{ po.supplier?.name ?? 'No supplier' }}
          <span v-if="po.expected_at"> · Expected {{ new Date(po.expected_at).toLocaleDateString('en-MY') }}</span>
        </p>
      </div>
      <div class="flex gap-2">
        <UButton v-if="canOrder" icon="i-lucide-send" @click="updateStatus('ordered')">Send Order</UButton>
        <UButton v-if="canReceive" icon="i-lucide-package-check" color="success" @click="openReceive">Receive Goods</UButton>
        <UButton v-if="canCancel" icon="i-lucide-x-circle" variant="outline" color="error" @click="updateStatus('cancelled')">Cancel</UButton>
      </div>
    </div>

    <!-- Line items -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <p class="font-semibold text-(--ui-text-highlighted)">Line Items</p>
          <UButton v-if="isEditable" icon="i-lucide-plus" size="sm" variant="outline" @click="addOpen = true">
            Add item
          </UButton>
        </div>
      </template>

      <div v-if="!po.items?.length" class="py-10 text-center text-sm text-(--ui-text-muted)">
        No items yet. Add products to this purchase order.
      </div>

      <div v-else>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-(--ui-border) text-xs text-(--ui-text-muted) uppercase tracking-wide">
              <th class="text-left py-2 font-medium">Product / Variant</th>
              <th class="text-right py-2 font-medium w-24">Qty ordered</th>
              <th class="text-right py-2 font-medium w-24">Received</th>
              <th class="text-right py-2 font-medium w-28">Unit cost</th>
              <th class="text-right py-2 font-medium w-28">Subtotal</th>
              <th class="w-8" />
            </tr>
          </thead>
          <tbody class="divide-y divide-(--ui-border)">
            <tr v-for="item in po.items" :key="item.id" class="group">
              <td class="py-3">
                <p class="font-medium text-(--ui-text-highlighted)">{{ item.product?.name ?? '—' }}</p>
                <p class="text-xs text-(--ui-text-muted)">{{ item.variant?.name ?? '' }}{{ item.variant?.sku ? ` · ${item.variant.sku}` : '' }}</p>
              </td>
              <td class="text-right py-3 tabular-nums">{{ item.qty_ordered }}</td>
              <td class="text-right py-3 tabular-nums" :class="item.qty_received === item.qty_ordered ? 'text-emerald-500 font-semibold' : 'text-(--ui-text-muted)'">
                {{ item.qty_received }}
              </td>
              <td class="text-right py-3 tabular-nums">{{ rm(item.unit_cost) }}</td>
              <td class="text-right py-3 tabular-nums font-semibold text-(--ui-text-highlighted)">
                {{ rm(item.qty_ordered * item.unit_cost) }}
              </td>
              <td class="text-right py-3">
                <UButton v-if="isEditable" icon="i-lucide-trash-2" variant="ghost" color="error" size="xs"
                  class="opacity-0 group-hover:opacity-100"
                  @click="removeItem(item.id)" />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="border-t border-(--ui-border)">
              <td colspan="4" class="pt-3 text-right text-sm font-semibold text-(--ui-text-highlighted)">Total</td>
              <td class="pt-3 text-right font-bold text-(--ui-text-highlighted) tabular-nums">{{ rm(totalCost) }}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </UCard>

    <!-- Notes -->
    <UCard v-if="po.notes">
      <template #header><p class="font-semibold text-(--ui-text-highlighted)">Notes</p></template>
      <p class="text-sm text-(--ui-text-muted) whitespace-pre-wrap">{{ po.notes }}</p>
    </UCard>

    <!-- Add item modal -->
    <UModal v-model:open="addOpen" title="Add Item" :ui="{ width: 'sm:max-w-md' }">
      <template #body>
        <div class="space-y-4">
          <UFormField label="Product" required>
            <USelect v-model="addForm.product_id" :options="[{ label: 'Select product…', value: '' }, ...productOptions]" class="w-full" />
          </UFormField>
          <UFormField v-if="variantOptions.length > 1" label="Variant">
            <USelect v-model="addForm.variant_id" :options="variantOptions" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField label="Qty ordered">
              <UInput v-model.number="addForm.qty_ordered" type="number" min="1" class="w-full" />
            </UFormField>
            <UFormField label="Unit cost (RM)">
              <UInput v-model.number="addForm.unit_cost" type="number" min="0" step="0.01" class="w-full" />
            </UFormField>
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton variant="outline" color="neutral" @click="addOpen = false">Cancel</UButton>
          <UButton :loading="addSaving" :disabled="!addForm.product_id" @click="submitAddItem">Add</UButton>
        </div>
      </template>
    </UModal>

    <!-- Receive goods modal -->
    <UModal v-model:open="receiveOpen" title="Receive Goods" :ui="{ width: 'sm:max-w-lg' }">
      <template #body>
        <p class="text-sm text-(--ui-text-muted) mb-4">Enter the quantity received for each item. Stock will be updated immediately.</p>
        <div class="space-y-3">
          <div
            v-for="item in (po.items ?? []).filter(i => i.qty_ordered > i.qty_received)"
            :key="item.id"
            class="flex items-center gap-3"
          >
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ item.product?.name }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ item.variant?.name }} · {{ item.qty_received }}/{{ item.qty_ordered }} received</p>
            </div>
            <UInput
              v-model.number="receiveQtys[item.id]"
              type="number"
              :min="0"
              :max="item.qty_ordered - item.qty_received"
              class="w-24"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 justify-end">
          <UButton variant="outline" color="neutral" @click="receiveOpen = false">Cancel</UButton>
          <UButton icon="i-lucide-package-check" :loading="receiving" @click="submitReceive">Confirm receipt</UButton>
        </div>
      </template>
    </UModal>

  </section>
</template>
