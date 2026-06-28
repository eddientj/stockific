<script setup lang="ts">
import type { InvoiceRow, CustomerRow } from '~/types'
import type { BusinessSettings } from '~/composables/useSettings'
import type { DocItem } from '~/components/InvoiceDoc.vue'

definePageMeta({ layout: false })

const route = useRoute()
const token = route.params.token as string

type PublicInvoice = InvoiceRow & {
  customers: Pick<CustomerRow, 'name' | 'email' | 'phone' | 'address'> | null
}

const { data, error } = await useFetch<{ invoice: PublicInvoice; settings: BusinessSettings | null }>(
  `/api/public/invoice/${token}`
)

if (error.value || !data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Invoice not found' })
}

const invoice  = data.value.invoice
const settings = data.value.settings

// Map to InvoiceDoc props
const customer = computed<CustomerRow | null>(() =>
  invoice.customers ? { ...invoice.customers, id: '', created_at: '', org_id: '' } as any : null
)

const items = computed<DocItem[]>(() =>
  (invoice.invoice_items ?? []).map((i, idx) => ({
    _key: idx,
    description: i.description,
    qty: i.qty,
    unit_price: i.unit_price,
  }))
)

const taxAmount = computed(() =>
  Math.round(invoice.subtotal * invoice.tax_rate / 100 * 100) / 100
)

const today = new Date().toISOString().slice(0, 10)

function print() { window.print() }
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
    <div class="max-w-3xl mx-auto">

      <!-- Toolbar -->
      <div class="flex items-center justify-between mb-6 print:hidden">
        <div class="flex items-center gap-2">
          <img src="/logo-icon.png" alt="Stockific" class="h-6 w-6 object-contain" />
          <span class="text-sm font-semibold text-gray-600 dark:text-gray-400">Stockific</span>
        </div>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          @click="print"
        >
          <UIcon name="i-lucide-printer" class="size-4" />
          Print / Save PDF
        </button>
      </div>

      <!-- Invoice card -->
      <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
        <InvoiceDoc
          :invoice-number="invoice.invoice_number"
          :is-new="false"
          :customer="customer"
          :issue-date="invoice.issue_date"
          :due-date="invoice.due_date ?? ''"
          :pay-terms="invoice.payment_terms ?? ''"
          :items="items"
          :subtotal="invoice.subtotal"
          :tax-amount="taxAmount"
          :tax-rate="invoice.tax_rate"
          :total="invoice.total"
          :discount="invoice.discount"
          :notes="invoice.notes ?? ''"
          :today="today"
          :settings="settings"
        />
      </div>

      <p class="text-center text-xs text-gray-400 mt-6 print:hidden">
        Powered by <a href="/" class="underline">Stockific</a>
      </p>

    </div>
  </div>
</template>
