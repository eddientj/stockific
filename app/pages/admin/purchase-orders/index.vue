<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { PurchaseOrderRow, ExportColumn } from '~/types'
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

const exportColumns: ExportColumn[] = [
  { key: 'po_number',   label: 'PO #'     },
  { key: 'supplier',    label: 'Supplier' },
  { key: 'status',      label: 'Status'   },
  { key: 'expected_at', label: 'Expected' },
  { key: 'created_at',  label: 'Created'  },
]
const exportData = computed(() =>
  (orders.value ?? []).map(po => ({
    id:          po.id,
    po_number:   po.po_number,
    supplier:    po.supplier?.name ?? '',
    status:      po.status,
    expected_at: po.expected_at ?? '',
    created_at:  po.created_at?.slice(0, 10) ?? '',
  })),
)

// ── Filter (status) ───────────────────────────────────────────
const filterOpen   = ref(false)
const statusFilter = ref<string>('all')
const activeFilterCount = computed(() => (statusFilter.value !== 'all' ? 1 : 0))
const filteredOrders = computed(() => {
  const list = orders.value ?? []
  return statusFilter.value === 'all' ? list : list.filter(po => po.status === statusFilter.value)
})
const statusFilterOptions = [
  { label: 'All statuses', value: 'all' },
  { label: 'Draft',        value: 'draft'     },
  { label: 'Ordered',      value: 'ordered'   },
  { label: 'Partial',      value: 'partial'   },
  { label: 'Received',     value: 'received'  },
  { label: 'Cancelled',    value: 'cancelled' },
]
function resetFilters() { statusFilter.value = 'all' }
</script>

<template>
  <section>
    <AppPageHeader title="Purchase Orders" description="Raise POs, receive goods, and update stock." />

    <AppDataTable
      :columns="columns"
      :data="filteredOrders"
      :loading="pending"
      create-label="New PO"
      search-field="po_number"
      filterable
      :active-filters="activeFilterCount"
      export-filename="purchase-orders"
      :export-columns="exportColumns"
      :export-data="exportData"
      empty-icon="i-lucide-clipboard-list"
      empty-title="No purchase orders yet"
      empty-hint="Raise your first PO to get started."
      @create="open = true"
      @filter="filterOpen = true"
    >
      <template #po_number-cell="{ row }">
        <NuxtLink :to="`/admin/purchase-orders/${row.original.id}`"
          class="font-mono font-semibold text-brand-500 hover:underline">
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
        <UTooltip :text="t('action.view')">
          <UButton icon="i-lucide-arrow-right" variant="ghost" color="neutral" size="sm"
            :to="`/admin/purchase-orders/${row.original.id}`" />
        </UTooltip>
      </template>
    </AppDataTable>

    <AppFormSlideover
      v-model="form"
      v-model:open="open"
      title="New Purchase Order"
      :fields="FIELDS"
      :loading="saving"
      save-label="Create PO"
      @save="create"
    />

    <!-- Status filter slideover -->
    <AppSlideover
      v-model:open="filterOpen"
      title="Filter purchase orders"
      description="Narrow purchase orders by status."
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterOpen = false"
      @cancel="resetFilters"
    >
      <UFormField label="Status">
        <USelect v-model="statusFilter" :items="statusFilterOptions" class="w-full" />
      </UFormField>
    </AppSlideover>
  </section>
</template>
