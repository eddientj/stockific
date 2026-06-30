<script setup lang="ts">
import type { ProductRow } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const toast = useAppToast()

// ── Data ─────────────────────────────────────────────────────
const { data: products } = await useFetch<ProductRow[]>('/api/products')
const { data: lots, refresh } = await useFetch<any[]>('/api/lots')

// ── Filter ───────────────────────────────────────────────────
type Filter = 'all' | 'expiring' | 'expired' | 'empty'
const filter = ref<Filter>('all')

const today = new Date().toISOString().slice(0, 10)
const soon  = new Date()
soon.setDate(soon.getDate() + 30)
const soonISO = soon.toISOString().slice(0, 10)

function lotStatus(expiry: string | null): 'expired' | 'expiring' | 'ok' {
  if (!expiry) return 'ok'
  if (expiry <= today) return 'expired'
  if (expiry <= soonISO) return 'expiring'
  return 'ok'
}

const filteredLots = computed(() => {
  const all = lots.value ?? []
  if (filter.value === 'expiring') return all.filter(l => lotStatus(l.expiry_date) === 'expiring' && l.qty_remaining > 0)
  if (filter.value === 'expired')  return all.filter(l => lotStatus(l.expiry_date) === 'expired')
  if (filter.value === 'empty')    return all.filter(l => l.qty_remaining === 0)
  return all
})

const FILTERS = computed(() => [
  { key: 'all',      label: t('lot.filterAll'),      count: lots.value?.length ?? 0 },
  { key: 'expiring', label: t('lot.filterExpiring'),  count: lots.value?.filter(l => lotStatus(l.expiry_date) === 'expiring' && l.qty_remaining > 0).length ?? 0 },
  { key: 'expired',  label: t('lot.filterExpired'),   count: lots.value?.filter(l => lotStatus(l.expiry_date) === 'expired').length ?? 0 },
  { key: 'empty',    label: t('lot.filterEmpty'),     count: lots.value?.filter(l => l.qty_remaining === 0).length ?? 0 },
])

// ── Add lot form ─────────────────────────────────────────────
const open    = ref(false)
const saving  = ref(false)
const form    = ref({ product_id: '', variant_id: '', batch_number: '', expiry_date: '', qty_received: 1, unit_cost: null as number | null, received_at: today, notes: '' })

const selectedProduct = computed(() => (products.value ?? []).find(p => p.id === form.value.product_id))

const productOptions = computed(() =>
  (products.value ?? []).map(p => ({ value: p.id, label: p.name }))
)

const variantOptions = computed(() =>
  (selectedProduct.value?.variants ?? []).map(v => ({
    value: v.id,
    label: v.name + (v.sku ? ` (${v.sku})` : ''),
  }))
)

// Reset variant when product changes
watch(() => form.value.product_id, () => { form.value.variant_id = '' })

const FIELDS = computed((): FieldDef[] => [
  { name: 'product_id',   label: t('lot.product'),     type: 'select', required: true, options: productOptions.value, placeholder: t('lot.selectProduct') },
  { name: 'variant_id',   label: t('lot.variant'),     type: 'select', required: true, options: variantOptions.value, placeholder: t('lot.selectVariant'), disabled: !form.value.product_id },
  { name: 'batch_number', label: t('lot.batchNum'),    type: 'text',   placeholder: t('lot.batchNumHelp') },
  { name: 'expiry_date',  label: t('lot.expiry'),      type: 'date' },
  { name: 'qty_received', label: t('lot.qty'),         type: 'number', required: true, min: 1, max: 999999 },
  { name: 'unit_cost',    label: t('lot.unitCost'),    type: 'number', min: 0, max: 1000000, decimals: 2 },
  { name: 'received_at',  label: t('lot.receivedAt'),  type: 'date', required: true },
  { name: 'notes',        label: t('lot.notes'),       type: 'textarea', placeholder: t('lot.notesHelp') },
])

function openAdd() {
  form.value = { product_id: '', variant_id: '', batch_number: '', expiry_date: '', qty_received: 1, unit_cost: null, received_at: today, notes: '' }
  open.value = true
}

async function save() {
  if (!form.value.variant_id) {
    toast.add({ title: t('lot.variantRequired'), color: 'error' })
    return
  }
  saving.value = true
  try {
    await $fetch('/api/lots', {
      method: 'POST',
      body: {
        product_id:   form.value.product_id || null,
        variant_id:   form.value.variant_id,
        batch_number: form.value.batch_number || null,
        expiry_date:  form.value.expiry_date || null,
        qty_received: form.value.qty_received,
        unit_cost:    form.value.unit_cost,
        received_at:  form.value.received_at,
        notes:        form.value.notes || null,
      },
    })
    toast.add({ title: t('lot.added'), color: 'success', icon: 'i-lucide-check' })
    open.value = false
    await refresh()
  } catch (err: any) {
    toast.add({ title: t('lot.addFailed'), description: err?.data?.statusMessage ?? err?.message, color: 'error' })
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
  <section class="space-y-5">

    <AppPageHeader :title="t('lot.title')" :subtitle="t('lot.subtitle')">
      <UButton icon="i-lucide-plus" @click="openAdd">{{ t('lot.add') }}</UButton>
    </AppPageHeader>

    <!-- Filter chips -->
    <div class="flex items-center gap-2 flex-wrap">
      <button
        v-for="f in FILTERS"
        :key="f.key"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors"
        :class="filter === f.key
          ? 'border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-950/30 dark:text-brand-300'
          : 'border-(--ui-border) text-(--ui-text-muted) hover:bg-(--ui-bg-elevated)'"
        @click="filter = f.key as Filter"
      >
        {{ f.label }}
        <span class="text-xs px-1.5 py-0.5 rounded-full" :class="filter === f.key ? 'bg-brand-500/20' : 'bg-(--ui-bg-elevated)'">{{ f.count }}</span>
      </button>
    </div>

    <!-- Lots table -->
    <div class="rounded-xl border border-(--ui-border) overflow-x-auto">
      <table class="w-full text-sm">
        <thead class="bg-(--ui-bg-elevated) border-b border-(--ui-border)">
          <tr>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lot.colProduct') }}</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lot.colBatch') }}</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lot.colExpiry') }}</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lot.colReceived') }}</th>
            <th class="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lot.colRemaining') }}</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lot.colStatus') }}</th>
            <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-(--ui-text-muted)">{{ t('lot.colReceivedAt') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-(--ui-border)">
          <tr v-if="!filteredLots.length">
            <td colspan="7" class="px-4 py-12 text-center text-(--ui-text-muted) text-sm">
              {{ t('lot.empty') }}
            </td>
          </tr>
          <tr
            v-for="lot in filteredLots"
            :key="lot.id"
            class="bg-(--ui-bg) hover:bg-(--ui-bg-elevated) transition-colors"
          >
            <td class="px-4 py-3">
              <p class="font-medium text-(--ui-text-highlighted)">{{ lot.products?.name ?? '—' }}</p>
              <p class="text-xs text-(--ui-text-muted)">
                {{ lot.variants?.name }}
                <span v-if="lot.variants?.sku" class="font-mono">· {{ lot.variants.sku }}</span>
              </p>
            </td>
            <td class="px-4 py-3 text-(--ui-text-muted) font-mono text-xs">{{ lot.batch_number ?? '—' }}</td>
            <td class="px-4 py-3">
              <span v-if="lot.expiry_date">
                <span class="text-(--ui-text-highlighted)">{{ fmtDate(lot.expiry_date) }}</span>
                <span v-if="daysUntil(lot.expiry_date) !== null" class="ml-1 text-xs text-(--ui-text-muted)">
                  ({{ daysUntil(lot.expiry_date)! > 0 ? `${daysUntil(lot.expiry_date)}d` : t('lot.today') }})
                </span>
              </span>
              <span v-else class="text-(--ui-text-muted)">—</span>
            </td>
            <td class="px-4 py-3 text-center text-(--ui-text-muted)">{{ lot.qty_received }}</td>
            <td class="px-4 py-3 text-center font-semibold" :class="lot.qty_remaining === 0 ? 'text-(--ui-text-muted)' : 'text-(--ui-text-highlighted)'">
              {{ lot.qty_remaining }}
            </td>
            <td class="px-4 py-3">
              <span
                class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
                :class="STATUS_CLASS[lotStatus(lot.expiry_date)]"
              >
                {{ lotStatus(lot.expiry_date) === 'expired' ? t('lot.statusExpired') : lotStatus(lot.expiry_date) === 'expiring' ? t('lot.statusExpiring') : t('lot.statusOk') }}
              </span>
            </td>
            <td class="px-4 py-3 text-xs text-(--ui-text-muted)">{{ fmtDate(lot.received_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Lot slideover -->
    <AppFormSlideover
      v-model:open="open"
      :title="t('lot.add')"
      :fields="FIELDS"
      :form="form"
      :saving="saving"
      @save="save"
      @update:form="form = $event"
    />

  </section>
</template>
