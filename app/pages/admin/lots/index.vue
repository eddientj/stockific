<script setup lang="ts">
import type { ProductRow, ExportColumn } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const toast = useAppToast()

// ── Data ─────────────────────────────────────────────────────
const { data: products } = await useFetch<ProductRow[]>('/api/products')
const { data: lots, refresh } = await useFetch<any[]>('/api/lots')

// ── Filter ────────────────────────────────────────────────────
type Filter = 'all' | 'expiring' | 'expired' | 'empty'
const filter     = ref<Filter>('all')
const filterOpen = ref(false)

const today   = new Date().toISOString().slice(0, 10)
const soon    = new Date(); soon.setDate(soon.getDate() + 30)
const soonISO = soon.toISOString().slice(0, 10)

function lotStatus(expiry: string | null): 'expired' | 'expiring' | 'ok' {
  if (!expiry) return 'ok'
  if (expiry <= today) return 'expired'
  if (expiry <= soonISO) return 'expiring'
  return 'ok'
}

const activeFilterCount = computed(() => filter.value !== 'all' ? 1 : 0)
function resetFilters() { filter.value = 'all' }

const filterOptions = computed(() => [
  { label: t('lot.filterAll'),      value: 'all'      },
  { label: t('lot.filterExpiring'), value: 'expiring' },
  { label: t('lot.filterExpired'),  value: 'expired'  },
  { label: t('lot.filterEmpty'),    value: 'empty'    },
])

// ── Flat table data ───────────────────────────────────────────
const lotsFlat = computed(() =>
  (lots.value ?? []).map(l => ({
    ...l,
    product_name: l.products?.name ?? '',
    variant_name: l.variants?.name ?? '',
    _status: lotStatus(l.expiry_date),
  }))
)

const filteredLots = computed(() => {
  const all = lotsFlat.value
  if (filter.value === 'expiring') return all.filter(l => l._status === 'expiring' && l.qty_remaining > 0)
  if (filter.value === 'expired')  return all.filter(l => l._status === 'expired')
  if (filter.value === 'empty')    return all.filter(l => l.qty_remaining === 0)
  return all
})

// ── Export ────────────────────────────────────────────────────
const exportColumns: ExportColumn[] = [
  { key: 'product_name',  label: 'Product'     },
  { key: 'variant_name',  label: 'Variant'     },
  { key: 'batch_number',  label: 'Batch No.'   },
  { key: 'expiry_date',   label: 'Expiry'      },
  { key: 'qty_received',  label: 'Received'    },
  { key: 'qty_remaining', label: 'Remaining'   },
  { key: 'unit_cost',     label: 'Unit Cost'   },
  { key: 'received_at',   label: 'Received At' },
  { key: 'notes',         label: 'Notes'       },
]

// ── Table columns ─────────────────────────────────────────────
const COLUMNS = [
  { accessorKey: 'product_name',  header: t('lot.colProduct')   },
  { accessorKey: 'batch_number',  header: t('lot.colBatch')     },
  { accessorKey: 'expiry_date',   header: t('lot.colExpiry')    },
  { accessorKey: 'qty_received',  header: t('lot.colReceived')  },
  { accessorKey: 'qty_remaining', header: t('lot.colRemaining') },
  { accessorKey: '_status',       header: t('lot.colStatus')    },
  { accessorKey: 'received_at',   header: t('lot.colReceivedAt')},
  { id: 'actions' },
]

// ── Slideover state ───────────────────────────────────────────
const open    = ref(false)
const saving  = ref(false)
const editing = ref<any | null>(null)

const blankForm = () => ({
  product_id: '', variant_id: '', batch_number: '', expiry_date: '',
  qty_received: 1, qty_remaining: 0, unit_cost: null as number | null,
  received_at: today, notes: '',
})
const form = ref(blankForm())

const selectedProduct = computed(() => (products.value ?? []).find(p => p.id === form.value.product_id))
const productOptions  = computed(() => (products.value ?? []).map(p => ({ value: p.id, label: p.name })))
const variantOptions  = computed(() => (selectedProduct.value?.variants ?? []).map(v => ({
  value: v.id,
  label: v.name + (v.sku ? ` (${v.sku})` : ''),
})))

watch(() => form.value.product_id, () => { form.value.variant_id = '' })

const FIELDS = computed((): FieldDef[] => editing.value ? [
  { name: 'batch_number',  label: t('lot.batchNum'),   type: 'text',     placeholder: t('lot.batchNumHelp') },
  { name: 'expiry_date',   label: t('lot.expiry'),     type: 'date' },
  { name: 'qty_received',  label: t('lot.qty'),        type: 'number',   required: true, min: 1, max: 999999 },
  { name: 'qty_remaining', label: t('lot.remaining'),  type: 'number',   required: true, min: 0, max: 999999 },
  { name: 'unit_cost',     label: t('lot.unitCost'),   type: 'number',   min: 0, max: 1000000, decimals: 2 },
  { name: 'received_at',   label: t('lot.receivedAt'), type: 'date',     required: true },
  { name: 'notes',         label: t('lot.notes'),      type: 'textarea', placeholder: t('lot.notesHelp') },
] : [
  { name: 'product_id',   label: t('lot.product'),    type: 'select',   required: true,  options: productOptions.value, placeholder: t('lot.selectProduct') },
  { name: 'variant_id',   label: t('lot.variant'),    type: 'select',   required: true,  options: variantOptions.value, placeholder: t('lot.selectVariant'), disabled: !form.value.product_id },
  { name: 'batch_number', label: t('lot.batchNum'),   type: 'text',     placeholder: t('lot.batchNumHelp') },
  { name: 'expiry_date',  label: t('lot.expiry'),     type: 'date' },
  { name: 'qty_received', label: t('lot.qty'),        type: 'number',   required: true, min: 1, max: 999999 },
  { name: 'unit_cost',    label: t('lot.unitCost'),   type: 'number',   min: 0, max: 1000000, decimals: 2 },
  { name: 'received_at',  label: t('lot.receivedAt'), type: 'date',     required: true },
  { name: 'notes',        label: t('lot.notes'),      type: 'textarea', placeholder: t('lot.notesHelp') },
])

function openAdd() {
  editing.value = null
  form.value = blankForm()
  open.value = true
}

function openEdit(lot: any) {
  editing.value = lot
  form.value = {
    product_id:    lot.product_id    ?? '',
    variant_id:    lot.variant_id    ?? '',
    batch_number:  lot.batch_number  ?? '',
    expiry_date:   lot.expiry_date   ?? '',
    qty_received:  lot.qty_received,
    qty_remaining: lot.qty_remaining,
    unit_cost:     lot.unit_cost     ?? null,
    received_at:   lot.received_at   ?? today,
    notes:         lot.notes         ?? '',
  }
  open.value = true
}

async function save() {
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/lots/${editing.value.id}`, {
        method: 'PATCH',
        body: {
          batch_number:  form.value.batch_number  || null,
          expiry_date:   form.value.expiry_date   || null,
          qty_received:  form.value.qty_received,
          qty_remaining: form.value.qty_remaining,
          unit_cost:     form.value.unit_cost,
          received_at:   form.value.received_at   || null,
          notes:         form.value.notes         || null,
        },
      })
      toast.add({ title: t('lot.updated'), color: 'success', icon: 'i-lucide-check' })
    } else {
      if (!form.value.variant_id) {
        toast.add({ title: t('lot.variantRequired'), color: 'error' })
        saving.value = false
        return
      }
      await $fetch('/api/lots', {
        method: 'POST',
        body: {
          product_id:   form.value.product_id  || null,
          variant_id:   form.value.variant_id,
          batch_number: form.value.batch_number || null,
          expiry_date:  form.value.expiry_date  || null,
          qty_received: form.value.qty_received,
          unit_cost:    form.value.unit_cost,
          received_at:  form.value.received_at,
          notes:        form.value.notes        || null,
        },
      })
      toast.add({ title: t('lot.added'), color: 'success', icon: 'i-lucide-check' })
    }
    open.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: editing.value ? t('lot.updateFailed') : t('lot.addFailed'), description: err?.data?.statusMessage ?? err?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Helpers ──────────────────────────────────────────────────
function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysUntil(d: string | null): number | null {
  if (!d) return null
  return Math.ceil((new Date(d + 'T00:00:00').getTime() - Date.now()) / 86_400_000)
}

const STATUS_CLASS: Record<string, string> = {
  expired:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expiring: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  ok:       'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
}
</script>

<template>
  <section>
    <AppPageHeader :title="t('lot.title')" :subtitle="t('lot.subtitle')" />

    <AppDataTable
      :columns="COLUMNS"
      :data="filteredLots"
      :create-label="t('lot.add')"
      :search-field="['product_name', 'variant_name', 'batch_number']"
      filterable
      :active-filters="activeFilterCount"
      export-filename="lots"
      :export-columns="exportColumns"
      :export-data="filteredLots"
      empty-icon="i-lucide-layers"
      :empty-title="t('lot.empty')"
      @create="openAdd"
      @filter="filterOpen = true"
    >
      <template #product_name-cell="{ row }">
        <p class="font-medium text-(--ui-text-highlighted)">{{ row.original.products?.name ?? '—' }}</p>
        <p class="text-xs text-(--ui-text-muted)">
          {{ row.original.variants?.name }}
          <span v-if="row.original.variants?.sku" class="font-mono"> · {{ row.original.variants.sku }}</span>
        </p>
      </template>

      <template #batch_number-cell="{ row }">
        <span class="font-mono text-xs text-(--ui-text-muted)">{{ row.original.batch_number ?? '—' }}</span>
      </template>

      <template #expiry_date-cell="{ row }">
        <span v-if="row.original.expiry_date">
          <span class="text-(--ui-text-highlighted)">{{ fmtDate(row.original.expiry_date) }}</span>
          <span v-if="daysUntil(row.original.expiry_date) !== null" class="ml-1 text-xs text-(--ui-text-muted)">
            ({{ daysUntil(row.original.expiry_date)! > 0 ? `${daysUntil(row.original.expiry_date)}d` : t('lot.today') }})
          </span>
        </span>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>

      <template #qty_remaining-cell="{ row }">
        <span :class="row.original.qty_remaining === 0 ? 'text-(--ui-text-muted)' : 'font-semibold text-(--ui-text-highlighted)'">
          {{ row.original.qty_remaining }}
        </span>
      </template>

      <template #_status-cell="{ row }">
        <span
          class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
          :class="STATUS_CLASS[row.original._status]"
        >
          {{ row.original._status === 'expired' ? t('lot.statusExpired') : row.original._status === 'expiring' ? t('lot.statusExpiring') : t('lot.statusOk') }}
        </span>
      </template>

      <template #received_at-cell="{ row }">
        <span class="text-xs text-(--ui-text-muted)">{{ fmtDate(row.original.received_at) }}</span>
      </template>

      <template #actions-cell="{ row }">
        <UButton size="xs" variant="ghost" color="neutral" icon="i-lucide-pencil" @click="openEdit(row.original)" />
      </template>
    </AppDataTable>

    <AppFormSlideover
      v-model:open="open"
      v-model="form"
      :title="editing ? t('lot.edit') : t('lot.add')"
      :fields="FIELDS"
      :loading="saving"
      @save="save"
    />

    <AppSlideover
      v-model:open="filterOpen"
      :title="t('lot.filter')"
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterOpen = false"
      @cancel="resetFilters"
    >
      <UFormField :label="t('lot.colStatus')">
        <USelect v-model="filter" :items="filterOptions" class="w-full" />
      </UFormField>
    </AppSlideover>

  </section>
</template>
