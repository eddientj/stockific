import type { InvoiceRow, InvoiceStatus } from '~/types'

// ── Status display config ─────────────────────────────────────
export type InvoiceStatusCfg = {
  color: string
  bg: string
  dot: string
}

export const INVOICE_STATUS_CFG: Record<InvoiceStatus, InvoiceStatusCfg> = {
  draft:     { color: 'text-(--ui-text-muted)',                  bg: 'bg-(--ui-bg-elevated) border-(--ui-border)',           dot: 'bg-(--ui-text-muted)'  },
  sent:      { color: 'text-sky-600    dark:text-sky-400',       bg: 'bg-sky-50    dark:bg-sky-900/30    border-sky-200',    dot: 'bg-sky-500'    },
  paid:      { color: 'text-emerald-600 dark:text-emerald-400',  bg: 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200', dot: 'bg-emerald-500' },
  overdue:   { color: 'text-red-600    dark:text-red-400',       bg: 'bg-red-50    dark:bg-red-900/30    border-red-200',    dot: 'bg-red-500'    },
  cancelled: { color: 'text-(--ui-text-muted)',                  bg: 'bg-(--ui-bg-elevated) border-(--ui-border)',           dot: 'bg-(--ui-border)'  },
  refunded:  { color: 'text-orange-600  dark:text-orange-400',  bg: 'bg-orange-50 dark:bg-orange-900/30 border-orange-200', dot: 'bg-orange-500' },
}

export const INVOICE_STATUSES = Object.keys(INVOICE_STATUS_CFG) as InvoiceStatus[]

// ── Composable ────────────────────────────────────────────────
export function useInvoices() {
  const toast             = useAppToast()
  const { exportSheet }   = useXlsx()

  const { data: invoices, pending, refresh } = useFetch<InvoiceRow[]>('/api/invoices')

  // ── Filters ──────────────────────────────────────────────────
  const search       = ref('')
  const statusFilter = ref<InvoiceStatus | 'all'>('all')

  const filtered = computed(() => {
    let rows = invoices.value ?? []
    if (statusFilter.value !== 'all')
      rows = rows.filter(i => i.status === statusFilter.value)
    if (search.value.trim()) {
      const q = search.value.toLowerCase()
      rows = rows.filter(i =>
        i.invoice_number.toLowerCase().includes(q) ||
        (i.customer_name ?? '').toLowerCase().includes(q) ||
        (i.customers?.name ?? '').toLowerCase().includes(q),
      )
    }
    return rows
  })

  // ── Derived counts ────────────────────────────────────────────
  const counts = computed(() =>
    Object.fromEntries(
      INVOICE_STATUSES.map(s => [s, (invoices.value ?? []).filter(i => i.status === s).length]),
    ) as Record<InvoiceStatus, number>,
  )

  const outstanding = computed(() =>
    (invoices.value ?? [])
      .filter(i => i.status === 'sent' || i.status === 'overdue')
      .reduce((s, i) => s + Number(i.total), 0),
  )

  // ── CRUD ──────────────────────────────────────────────────────
  async function deleteInvoice(id: string, num: string) {
    if (!confirm(`Delete ${num}? This cannot be undone.`)) return
    try {
      await $fetch(`/api/invoices/${id}`, { method: 'DELETE' })
      toast.add({ title: 'Invoice deleted', color: 'success', icon: 'i-lucide-check' })
      await refresh()
    } catch (e: any) {
      toast.add({ title: 'Delete failed', description: e?.data?.statusMessage, color: 'error' })
    }
  }

  async function markPaid(id: string) {
    try {
      await $fetch(`/api/invoices/${id}`, { method: 'PATCH', body: { status: 'paid' } })
      toast.add({ title: 'Marked as paid', color: 'success', icon: 'i-lucide-check' })
      await refresh()
    } catch (e: any) {
      toast.add({ title: 'Failed', description: e?.data?.statusMessage, color: 'error' })
    }
  }

  // ── Export ────────────────────────────────────────────────────
  async function exportXlsx() {
    const rows = (invoices.value ?? []).map(i => ({
      'Invoice #':     i.invoice_number,
      'Customer':      i.customers?.name ?? i.customer_name ?? '',
      'Issue Date':    i.issue_date,
      'Due Date':      i.due_date ?? '',
      'Status':        i.status,
      'Subtotal (RM)': Number(i.subtotal).toFixed(2),
      'Tax (RM)':      (Number(i.subtotal) * Number(i.tax_rate) / 100).toFixed(2),
      'Discount (RM)': Number(i.discount).toFixed(2),
      'Total (RM)':    Number(i.total).toFixed(2),
    }))
    await exportSheet(rows, 'invoices', 'Invoices')
  }

  // ── Helper ────────────────────────────────────────────────────
  function rm(n: number) {
    return `RM ${Number(n).toFixed(2)}`
  }

  return {
    invoices,
    pending,
    refresh,
    search,
    statusFilter,
    filtered,
    counts,
    outstanding,
    deleteInvoice,
    markPaid,
    exportXlsx,
    rm,
  }
}
