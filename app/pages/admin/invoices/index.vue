<script setup lang="ts">
import { useInvoices, INVOICE_STATUS_CFG, INVOICE_STATUSES } from '~/composables/useInvoices'
import type { InvoiceStatus } from '~/types'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

const {
  filtered, pending,
  search, statusFilter,
  counts, outstanding,
  deleteInvoice, markPaid, exportXlsx,
  rm,
} = useInvoices()

// Build chip list for AppStatusChips
const statusChips = computed(() =>
  INVOICE_STATUSES.map(key => ({
    key,
    label: t(`status.${key}`),
    count: counts.value[key],
    color: INVOICE_STATUS_CFG[key].color,
    bg:    INVOICE_STATUS_CFG[key].bg,
  }))
)
</script>

<template>
  <section class="space-y-6">

    <div class="flex items-start justify-between gap-4">
      <AppPageHeader :title="t('inv.title')" :description="t('inv.subtitle')" class="mb-0" />
      <div class="flex items-center gap-2 shrink-0">
        <UButton icon="i-lucide-download" variant="outline" color="neutral" size="sm" @click="exportXlsx">{{ t('action.export') }}</UButton>
        <UButton icon="i-lucide-plus" size="sm" to="/admin/invoices/new">{{ t('inv.new') }}</UButton>
      </div>
    </div>

    <!-- Status chips -->
    <AppStatusChips v-model="statusFilter" :chips="statusChips" />

    <!-- Outstanding banner -->
    <div v-if="outstanding > 0" class="flex items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
      <UIcon name="i-lucide-clock" class="size-4 text-amber-500 shrink-0" />
      <p class="text-sm text-amber-700 dark:text-amber-300">
        <strong>{{ rm(outstanding) }}</strong> {{ t('inv.outstanding') }} {{ counts.sent + counts.overdue }} {{ t('inv.invoicesLabel') }}
      </p>
    </div>

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <UInput v-model="search" icon="i-lucide-search" :placeholder="t('inv.search')" class="w-full sm:w-72" />
      <div class="flex items-center gap-2">
        <span class="text-sm text-(--ui-text-muted)">{{ filtered.length }} {{ t('inv.invoicesLabel') }}</span>
        <UButton v-if="statusFilter !== 'all'" size="xs" variant="soft" color="neutral" icon="i-lucide-x" @click="statusFilter = 'all'">{{ t('inv.clear') }}</UButton>
      </div>
    </div>

    <!-- Table -->
    <AppListTable :loading="pending" :row-count="filtered.length">
      <template #head>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">{{ t('inv.colInvoice') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">{{ t('inv.colCustomer') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) hidden sm:table-cell">{{ t('inv.colIssued') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) hidden md:table-cell">{{ t('inv.colDue') }}</th>
        <th class="text-right px-4 py-3 font-medium text-(--ui-text-muted)">{{ t('inv.colAmount') }}</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">{{ t('inv.colStatus') }}</th>
        <th class="px-4 py-3 w-24" />
      </template>

      <!-- Rows -->
      <tr
        v-for="inv in filtered"
        :key="inv.id"
        class="border-b border-(--ui-border) last:border-0 hover:bg-(--ui-bg-elevated) transition-colors"
      >
        <td class="px-4 py-3">
          <NuxtLink :to="`/admin/invoices/${inv.id}`" class="font-mono text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline">
            {{ inv.invoice_number }}
          </NuxtLink>
        </td>
        <td class="px-4 py-3">
          <p class="font-medium text-(--ui-text-highlighted)">{{ inv.customers?.name ?? inv.customer_name ?? '—' }}</p>
          <p class="text-xs text-(--ui-text-muted)">{{ inv.customers?.email ?? '' }}</p>
        </td>
        <td class="px-4 py-3 text-(--ui-text-muted) hidden sm:table-cell">{{ inv.issue_date }}</td>
        <td class="px-4 py-3 hidden md:table-cell">
          <span v-if="inv.due_date" :class="inv.status === 'overdue' ? 'text-red-500 font-medium' : 'text-(--ui-text-muted)'">{{ inv.due_date }}</span>
          <span v-else class="text-(--ui-text-muted) opacity-40">—</span>
        </td>
        <td class="px-4 py-3 text-right font-semibold text-(--ui-text-highlighted)">{{ rm(inv.total) }}</td>
        <td class="px-4 py-3">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border capitalize"
            :class="[INVOICE_STATUS_CFG[inv.status].color, INVOICE_STATUS_CFG[inv.status].bg]"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="INVOICE_STATUS_CFG[inv.status].dot" />
            {{ t('status.' + inv.status) }}
          </span>
        </td>
        <td class="px-4 py-3">
          <div class="flex justify-end gap-1">
            <UButton v-if="inv.status === 'sent' || inv.status === 'overdue'" icon="i-lucide-check" variant="ghost" color="success" size="xs" :title="t('inv.markPaid')" @click.stop="markPaid(inv.id)" />
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="xs" :to="`/admin/invoices/${inv.id}`" />
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="xs" @click="deleteInvoice(inv.id, inv.invoice_number)" />
          </div>
        </td>
      </tr>

      <!-- Empty -->
      <template #empty>
        <div class="py-16 text-center">
          <UIcon name="i-lucide-file-text" class="size-10 text-(--ui-text-muted) mx-auto mb-3" />
          <p class="font-medium text-(--ui-text-highlighted)">{{ t('inv.noInvoices') }}</p>
          <p class="text-sm text-(--ui-text-muted) mt-1">{{ t('inv.noInvHint') }}</p>
          <UButton icon="i-lucide-plus" size="sm" class="mt-4" to="/admin/invoices/new">{{ t('inv.new') }}</UButton>
        </div>
      </template>
    </AppListTable>

  </section>
</template>
