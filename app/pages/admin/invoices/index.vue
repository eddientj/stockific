<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { useInvoices, INVOICE_STATUS_CFG, INVOICE_STATUSES } from '~/composables/useInvoices'
import type { InvoiceRow, ExportColumn } from '~/types'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

const {
  filtered, pending,
  statusFilter,
  counts, outstanding,
  deleteInvoice, markPaid,
  rm,
} = useInvoices()

// ── Table columns ─────────────────────────────────────────────
const columns = computed<TableColumn<InvoiceRow>[]>(() => [
  { accessorKey: 'invoice_number', header: t('inv.colInvoice'),  enableSorting: true  },
  { id: 'customer',                header: t('inv.colCustomer')                       },
  { accessorKey: 'issue_date',     header: t('inv.colIssued'),   enableSorting: true  },
  { accessorKey: 'due_date',       header: t('inv.colDue'),      enableSorting: false },
  { accessorKey: 'total',          header: t('inv.colAmount'),   enableSorting: true  },
  { accessorKey: 'status',         header: t('inv.colStatus'),   enableSorting: false },
  { id: 'actions',                 header: ''                                         },
])

// ── Export ────────────────────────────────────────────────────
const exportColumns: ExportColumn[] = [
  { key: 'invoice_number', label: 'Invoice'     },
  { key: 'customer',       label: 'Customer'    },
  { key: 'issue_date',     label: 'Issued'      },
  { key: 'due_date',       label: 'Due'         },
  { key: 'total',          label: 'Amount (RM)' },
  { key: 'status',         label: 'Status'      },
]
const exportData = computed(() =>
  filtered.value.map(inv => ({
    id:             inv.id,
    invoice_number: inv.invoice_number,
    customer:       inv.customers?.name ?? inv.customer_name ?? '',
    issue_date:     inv.issue_date,
    due_date:       inv.due_date ?? '',
    total:          inv.total,
    status:         inv.status,
  })),
)

// ── Status filter slideover ───────────────────────────────────
const filterOpen = ref(false)
const activeFilterCount = computed(() => (statusFilter.value !== 'all' ? 1 : 0))
const statusOptions = computed(() => [
  { label: t('inv.allStatuses'), value: 'all' },
  ...INVOICE_STATUSES.map(s => ({ label: t(`status.${s}`), value: s })),
])

function onCreate() { navigateTo('/admin/invoices/new') }
</script>

<template>
  <section>
    <AppPageHeader :title="t('inv.title')" :description="t('inv.subtitle')" />

    <!-- Outstanding banner -->
    <div v-if="outstanding > 0" class="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3 mb-4">
      <UIcon name="i-lucide-clock" class="size-4 text-amber-500 shrink-0" />
      <p class="text-sm text-amber-700 dark:text-amber-300">
        <strong>{{ rm(outstanding) }}</strong> {{ t('inv.outstanding') }} {{ counts.sent + counts.overdue }} {{ t('inv.invoicesLabel') }}
      </p>
    </div>

    <AppDataTable
      :columns="columns"
      :data="filtered"
      :loading="pending"
      :create-label="t('inv.new')"
      :search-field="['invoice_number', 'customer_name']"
      filterable
      :active-filters="activeFilterCount"
      export-filename="invoices"
      :export-columns="exportColumns"
      :export-data="exportData"
      empty-icon="i-lucide-file-text"
      :empty-title="t('inv.noInvoices')"
      :empty-hint="t('inv.noInvHint')"
      @create="onCreate"
      @filter="filterOpen = true"
    >
      <template #invoice_number-cell="{ row }">
        <NuxtLink :to="`/admin/invoices/${row.original.id}`" class="font-mono text-xs font-semibold text-brand-500 hover:underline">
          {{ row.original.invoice_number }}
        </NuxtLink>
      </template>

      <template #customer-cell="{ row }">
        <div>
          <p class="font-medium text-(--ui-text-highlighted)">{{ row.original.customers?.name ?? row.original.customer_name ?? '—' }}</p>
          <p v-if="row.original.customers?.email" class="text-xs text-(--ui-text-muted)">{{ row.original.customers.email }}</p>
        </div>
      </template>

      <template #issue_date-cell="{ row }">
        <span class="text-(--ui-text-muted) text-sm">{{ row.original.issue_date }}</span>
      </template>

      <template #due_date-cell="{ row }">
        <span v-if="row.original.due_date" :class="row.original.status === 'overdue' ? 'text-red-500 font-medium text-sm' : 'text-(--ui-text-muted) text-sm'">{{ row.original.due_date }}</span>
        <span v-else class="text-(--ui-text-muted) opacity-40">—</span>
      </template>

      <template #total-cell="{ row }">
        <span class="font-semibold text-(--ui-text-highlighted)">{{ rm(row.original.total) }}</span>
      </template>

      <template #status-cell="{ row }">
        <span
          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize"
          :class="[INVOICE_STATUS_CFG[row.original.status].color, INVOICE_STATUS_CFG[row.original.status].bg]"
        >
          <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="INVOICE_STATUS_CFG[row.original.status].dot" />
          {{ t('status.' + row.original.status) }}
        </span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UTooltip v-if="row.original.status === 'sent' || row.original.status === 'overdue'" :text="t('inv.markPaid')">
            <UButton icon="i-lucide-check" variant="ghost" color="success" size="sm" @click="markPaid(row.original.id)" />
          </UTooltip>
          <UTooltip :text="t('action.edit')">
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="sm" :to="`/admin/invoices/${row.original.id}`" />
          </UTooltip>
          <UTooltip :text="t('action.delete')">
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm"
              @click="deleteInvoice(row.original.id, row.original.invoice_number)" />
          </UTooltip>
        </div>
      </template>

    </AppDataTable>

    <!-- Status filter slideover -->
    <AppSlideover
      v-model:open="filterOpen"
      :title="t('inv.filter')"
      :description="t('inv.filterHint')"
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterOpen = false"
      @cancel="statusFilter = 'all'"
    >
      <UFormField :label="t('inv.colStatus')">
        <USelect v-model="statusFilter" :items="statusOptions" class="w-full" />
      </UFormField>
    </AppSlideover>
  </section>
</template>
