<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PurchaseOrderRow } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t }  = useLocale()
const toast  = useAppToast()
const { orders, pending, createOrder } = usePurchaseOrders()
const { suppliers } = useSuppliers()

const open   = ref(false)
const saving = ref(false)
const form   = ref<Record<string, any>>({ supplier_id: '', expected_at: '', notes: '' })

const FIELDS = computed<FieldDef[]>(() => [
  {
    name: 'supplier_id', label: 'Supplier', type: 'select', span: 2,
    placeholder: '— No supplier —',
    options: (suppliers.value ?? []).map(s => ({ label: s.name, value: s.id })),
  },
  { name: 'expected_at', label: 'Expected delivery', type: 'date' },
  { name: 'notes', label: t('field.notes'), type: 'textarea', rows: 2, placeholder: 'Optional notes' },
])

async function create() {
  saving.value = true
  try {
    const po = await createOrder({
      supplier_id: form.value.supplier_id || null,
      notes:       form.value.notes       || null,
      expected_at: form.value.expected_at || null,
    } as any)
    open.value = false
    form.value = { supplier_id: '', expected_at: '', notes: '' }
    await navigateTo(`/admin/purchase-orders/${po.id}`)
  } catch (e: any) {
    toast.error('Failed to create PO', e?.data?.statusMessage ?? e?.message)
  } finally {
    saving.value = false
  }
}

const STATUS_COLOR: Record<string, 'neutral' | 'info' | 'warning' | 'success' | 'error'> = {
  draft: 'neutral', ordered: 'info', partial: 'warning', received: 'success', cancelled: 'error',
}

const columns: TableColumn<PurchaseOrderRow>[] = [
  { accessorKey: 'po_number',   header: 'PO #'     },
  { id: 'supplier',             header: 'Supplier' },
  { accessorKey: 'status',      header: 'Status'   },
  { accessorKey: 'expected_at', header: 'Expected' },
  { accessorKey: 'created_at',  header: 'Created'  },
  { id: 'actions',              header: ''         },
]
</script>

<template>
  <section>
    <div class="flex items-center justify-between mb-6">
      <AppPageHeader title="Purchase Orders" description="Raise POs, receive goods, and update stock." class="mb-0" />
      <UButton icon="i-lucide-plus" @click="open = true">New PO</UButton>
    </div>

    <UCard>
      <UTable :data="orders ?? []" :columns="columns" :loading="pending">
        <template #po_number-cell="{ row }">
          <NuxtLink :to="`/admin/purchase-orders/${row.original.id}`"
            class="font-mono font-semibold text-indigo-500 hover:underline">
            {{ row.original.po_number }}
          </NuxtLink>
        </template>
        <template #supplier-cell="{ row }">{{ row.original.supplier?.name ?? '—' }}</template>
        <template #status-cell="{ row }">
          <UBadge :color="STATUS_COLOR[row.original.status] ?? 'neutral'" variant="subtle" size="sm" class="capitalize">
            {{ row.original.status }}
          </UBadge>
        </template>
        <template #expected_at-cell="{ row }">
          {{ row.original.expected_at ? new Date(row.original.expected_at).toLocaleDateString('en-MY') : '—' }}
        </template>
        <template #created_at-cell="{ row }">
          {{ new Date(row.original.created_at).toLocaleDateString('en-MY') }}
        </template>
        <template #actions-cell="{ row }">
          <UButton icon="i-lucide-arrow-right" variant="ghost" color="neutral" size="xs"
            :to="`/admin/purchase-orders/${row.original.id}`" />
        </template>
        <template #empty>
          <div class="py-10 text-center text-sm text-(--ui-text-muted)">No purchase orders yet.</div>
        </template>
      </UTable>
    </UCard>

    <AppFormSlideover
      v-model="form"
      v-model:open="open"
      title="New Purchase Order"
      :fields="FIELDS"
      :loading="saving"
      save-label="Create PO"
      @save="create"
    />
  </section>
</template>
