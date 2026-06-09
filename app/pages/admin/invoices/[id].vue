<script setup lang="ts">
import type { InvoiceRow, InvoiceItemPayload, CustomerRow, ProductRow } from '~/types'
import type { DocItem } from '~/components/InvoiceDoc.vue'

definePageMeta({ layout: 'admin' })

const route  = useRoute()
const router = useRouter()
const toast  = useAppToast()

const isNew = route.params.id === 'new'
const id    = isNew ? null : (route.params.id as string)

// ── Fetch existing invoice (edit mode) ───────────────────────
const { data: existing } = isNew
  ? { data: ref<InvoiceRow | null>(null) }
  : await useFetch<InvoiceRow>(`/api/invoices/${id}`)

// ── Customers + Products dropdowns ───────────────────────────
const { data: customers } = await useFetch<CustomerRow[]>('/api/customers')
const { data: products  } = await useFetch<ProductRow[]>('/api/products')

// ── Form state ────────────────────────────────────────────────
const selectedCustomerId = ref<string | undefined>(existing.value?.customer_id ?? undefined)
const issueDate   = ref(existing.value?.issue_date   ?? new Date().toISOString().slice(0, 10))
const dueDate     = ref(existing.value?.due_date     ?? '')
const payTerms    = ref(existing.value?.payment_terms ?? '30 days')
const taxRate     = ref(existing.value?.tax_rate     ?? 6)
const discount    = ref(existing.value?.discount     ?? 0)
const notes       = ref(existing.value?.notes        ?? '')
const status      = ref(existing.value?.status       ?? 'draft')

type LineItem = InvoiceItemPayload & { _key: number }
let _key = 0
const items = ref<LineItem[]>(
  existing.value?.invoice_items?.map(i => ({
    _key: _key++,
    id: i.id,
    description: i.description,
    qty: i.qty,
    unit_price: i.unit_price,
  })) ?? [{ _key: _key++, description: '', qty: 1, unit_price: 0 }]
)

function addItem() { items.value.push({ _key: _key++, description: '', qty: 1, unit_price: 0 }) }
function removeItem(k: number) {
  if (items.value.length <= 1) return
  items.value = items.value.filter(i => i._key !== k)
}

// ── Fill line item from a product ─────────────────────────────
function fillFromProduct(item: LineItem, productId: string) {
  const p = (products.value ?? []).find(x => x.id === productId)
  if (!p) return
  item.description = p.name
  item.unit_price  = p.price
}

// ── Totals ────────────────────────────────────────────────────
const subtotal  = computed(() => items.value.reduce((s, i) => s + i.qty * i.unit_price, 0))
const taxAmount = computed(() => Math.round(subtotal.value * taxRate.value / 100 * 100) / 100)
const total     = computed(() => Math.round((subtotal.value + taxAmount.value - discount.value) * 100) / 100)

// ── Selected customer ─────────────────────────────────────────
const selectedCustomer = computed(() =>
  (customers.value ?? []).find(c => c.id === selectedCustomerId.value) ?? null
)

// ── Payment terms presets ─────────────────────────────────────
const PAY_TERMS = ['Due on receipt', '7 days', '14 days', '30 days', '60 days']

watch(payTerms, (terms) => {
  const days = parseInt(terms)
  if (!isNaN(days)) {
    const d = new Date(issueDate.value)
    d.setDate(d.getDate() + days)
    dueDate.value = d.toISOString().slice(0, 10)
  } else {
    dueDate.value = issueDate.value
  }
}, { immediate: !existing.value })

// ── Save ──────────────────────────────────────────────────────
const saving = ref(false)

async function save(newStatus?: string) {
  saving.value = true
  try {
    const payload = {
      customer_id:   selectedCustomerId.value ?? null,
      customer_name: selectedCustomer.value?.name ?? null,
      issue_date:    issueDate.value,
      due_date:      dueDate.value || null,
      status:        newStatus ?? status.value,
      tax_rate:      taxRate.value,
      discount:      discount.value,
      notes:         notes.value || null,
      payment_terms: payTerms.value || null,
      items:         items.value.map(i => ({
        id:          i.id,
        description: i.description,
        qty:         i.qty,
        unit_price:  i.unit_price,
      })),
    }
    if (isNew) {
      const inv = await $fetch<{ id: string }>('/api/invoices', { method: 'POST', body: payload })
      toast.add({ title: 'Invoice created', color: 'success', icon: 'i-lucide-check' })
      await router.replace(`/admin/invoices/${inv.id}`)
    } else {
      await $fetch(`/api/invoices/${id}`, { method: 'PATCH', body: payload })
      toast.add({ title: 'Invoice saved', color: 'success', icon: 'i-lucide-check' })
      if (newStatus) status.value = newStatus as any
    }
  } catch (e: any) {
    toast.add({ title: 'Save failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Print / PDF ───────────────────────────────────────────────
function printInvoice() { window.print() }

// ── Helpers ───────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'text-(--ui-text-muted)', sent: 'text-sky-500', paid: 'text-teal-500',
  overdue: 'text-red-500', cancelled: 'text-(--ui-text-muted)',
}

// ── Props bundle for InvoiceDoc ───────────────────────────────
// Print version filters out any unfilled rows
const printItems = computed(() =>
  items.value.filter(i => i.description.trim() !== '')
)

const docProps = computed(() => ({
  invoiceNumber: isNew ? null : existing.value?.invoice_number,
  isNew,
  customer:      selectedCustomer.value,
  issueDate:     issueDate.value,
  dueDate:       dueDate.value,
  payTerms:      payTerms.value,
  items:         items.value as DocItem[],
  subtotal:      subtotal.value,
  taxAmount:     taxAmount.value,
  taxRate:       taxRate.value,
  total:         total.value,
  discount:      discount.value,
  notes:         notes.value,
  today,
}))

// ── Number input helpers (same pattern as ProductForm) ────────
function blockE(e: KeyboardEvent) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}

// Generic: clamps an event's input and calls setter
function clampInput(setter: (v: number) => void, min: number, max: number, decimals: number, e: Event) {
  const input = e.target as HTMLInputElement
  if (input.value === '') return
  const v = parseFloat(Number(input.value).toFixed(decimals))
  const clamped = Math.min(max, Math.max(min, isNaN(v) ? min : v))
  input.value = String(clamped)
  setter(clamped)
}
</script>

<template>
  <div class="space-y-4">

    <!-- ── Page header ────────────────────────────────────────── -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-3">
        <UButton icon="i-lucide-arrow-left" variant="ghost" color="neutral" size="sm" to="/admin/invoices" />
        <div>
          <h1 class="text-xl font-semibold text-(--ui-text-highlighted)">
            {{ isNew ? 'New Invoice' : existing?.invoice_number }}
          </h1>
          <p v-if="!isNew" class="text-xs text-(--ui-text-muted)">
            Last updated {{ existing?.updated_at?.slice(0, 10) }}
            ·
            <span :class="STATUS_COLORS[status]">{{ STATUS_LABELS[status] }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <UTooltip text="More settings → uncheck Headers and footers for a clean PDF">
          <UButton icon="i-lucide-printer" variant="ghost" color="neutral" size="sm" @click="printInvoice" />
        </UTooltip>
        <UButton
          v-if="!isNew && status === 'draft'"
          variant="outline"
          color="neutral"
          size="sm"
          :loading="saving"
          @click="save('sent')"
        >
          Mark as sent
        </UButton>
        <UButton
          v-if="!isNew && (status === 'sent' || status === 'overdue')"
          variant="outline"
          color="success"
          size="sm"
          icon="i-lucide-check"
          :loading="saving"
          @click="save('paid')"
        >
          Mark paid
        </UButton>
        <UButton icon="i-lucide-save" size="sm" :loading="saving" @click="save()">
          {{ isNew ? 'Create invoice' : 'Save' }}
        </UButton>
      </div>
    </div>

    <!-- ── Split layout ───────────────────────────────────────── -->
    <div class="grid xl:grid-cols-2 gap-6 items-start">

      <!-- ════════════ FORM SIDE ════════════ -->
      <div class="space-y-4">

        <!-- Customer + dates -->
        <UCard>
          <template #header>
            <p class="font-semibold text-(--ui-text-highlighted)">Invoice details</p>
          </template>
          <div class="space-y-4">
            <UFormField label="Customer" name="customer">
              <USelectMenu
                v-model="selectedCustomerId"
                :items="(customers ?? []).map(c => ({ label: c.name, value: c.id, description: c.email ?? '' }))"
                value-key="value"
                placeholder="Select a customer…"
                searchable
                searchable-placeholder="Search customers…"
                class="w-full"
              >
                <template #trailing>
                  <UButton icon="i-lucide-user-plus" variant="ghost" color="neutral" size="xs" to="/admin/customers?create=1" title="Add new customer" @click.stop />
                </template>
              </USelectMenu>
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Issue date" name="issue_date">
                <UInput v-model="issueDate" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Payment terms" name="pay_terms">
                <USelectMenu v-model="payTerms" :items="PAY_TERMS" class="w-full" />
              </UFormField>
            </div>

            <div class="grid grid-cols-2 gap-3">
              <UFormField label="Due date" name="due_date">
                <UInput v-model="dueDate" type="date" class="w-full" />
              </UFormField>
              <UFormField label="Status" name="status">
                <USelectMenu
                  v-model="status"
                  :items="[
                    { label: 'Draft',     value: 'draft'     },
                    { label: 'Sent',      value: 'sent'      },
                    { label: 'Paid',      value: 'paid'      },
                    { label: 'Overdue',   value: 'overdue'   },
                    { label: 'Cancelled', value: 'cancelled' },
                  ]"
                  value-key="value"
                  class="w-full"
                />
              </UFormField>
            </div>
          </div>
        </UCard>

        <!-- Line items -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold text-(--ui-text-highlighted)">Line items</p>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addItem">Add item</UButton>
            </div>
          </template>

          <div class="space-y-2">
            <!-- Column labels -->
            <div class="grid grid-cols-[1fr_56px_88px_32px] gap-2 text-xs text-(--ui-text-muted) px-0.5">
              <span>Description</span>
              <span class="text-center">Qty</span>
              <span class="text-right">Unit price</span>
              <span />
            </div>

            <div v-for="item in items" :key="item._key" class="space-y-1.5">
              <!-- Product quick-fill -->
              <USelectMenu
                :items="(products ?? []).filter(p => p.is_active).map(p => ({ label: p.name, value: p.id, description: `RM ${p.price.toFixed(2)}` }))"
                value-key="value"
                placeholder="← Quick-fill from product…"
                searchable
                searchable-placeholder="Search products…"
                class="w-full text-xs"
                :ui="{ base: 'text-xs h-7' }"
                @update:model-value="fillFromProduct(item, $event as string)"
              />
              <!-- Row inputs -->
              <div class="grid grid-cols-[1fr_56px_88px_32px] gap-2 items-center">
                <UInput v-model="item.description" placeholder="Item description" class="w-full" />
                <UInput
                  :value="item.qty"
                  type="number" min="0.01" max="99999" step="0.01" placeholder="1"
                  class="w-full text-center"
                  @keydown="blockE"
                  @input="clampInput(v => item.qty = v, 0.01, 99999, 2, $event)"
                />
                <UInput
                  :value="item.unit_price"
                  type="number" min="0" max="99999" step="0.01" placeholder="0.00"
                  class="w-full text-right"
                  @keydown="blockE"
                  @input="clampInput(v => item.unit_price = v, 0, 99999, 2, $event)"
                />
                <UButton
                  icon="i-lucide-x"
                  variant="ghost"
                  color="neutral"
                  size="xs"
                  :disabled="items.length <= 1"
                  @click="removeItem(item._key)"
                />
              </div>
            </div>
          </div>

          <!-- Totals -->
          <div class="mt-4 pt-4 border-t border-(--ui-border) space-y-1.5 text-sm">
            <div class="flex justify-between">
              <span class="text-(--ui-text-muted)">Subtotal</span>
              <span class="text-(--ui-text-highlighted)">RM {{ subtotal.toFixed(2) }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-(--ui-text-muted)">Tax (%)</span>
                <UInput
                  :value="taxRate"
                  type="number" min="0" max="100" step="0.1" placeholder="6"
                  class="w-20 h-7 text-xs"
                  @keydown="blockE"
                  @input="clampInput(v => taxRate = v, 0, 100, 1, $event)"
                />
              </div>
              <span class="text-(--ui-text-highlighted)">RM {{ taxAmount.toFixed(2) }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-(--ui-text-muted)">Discount (RM)</span>
                <UInput
                  :value="discount"
                  type="number" min="0" max="99999" step="0.01" placeholder="0.00"
                  class="w-20 h-7 text-xs"
                  @keydown="blockE"
                  @input="clampInput(v => discount = v, 0, 99999, 2, $event)"
                />
              </div>
              <span :class="discount > 0 ? 'text-teal-500' : 'text-(--ui-text-muted)'" class="text-xs">
                {{ discount > 0 ? `-RM ${discount.toFixed(2)}` : '—' }}
              </span>
            </div>
            <div class="flex justify-between font-semibold pt-1 border-t border-(--ui-border)">
              <span class="text-(--ui-text-highlighted)">Total</span>
              <span class="text-teal-500 text-base">RM {{ total.toFixed(2) }}</span>
            </div>
          </div>
        </UCard>

        <!-- Notes -->
        <UCard>
          <template #header>
            <p class="font-semibold text-(--ui-text-highlighted)">Notes &amp; terms</p>
          </template>
          <UTextarea
            v-model="notes"
            placeholder="Payment instructions, bank details, or any notes for the customer…"
            :rows="4"
            class="w-full"
          />
        </UCard>

      </div>

      <!-- ════════════ PREVIEW SIDE (screen only) ════════════ -->
      <div class="xl:sticky xl:top-6">
        <UCard>
          <template #header>
            <p class="font-semibold text-(--ui-text-highlighted)">Preview</p>
          </template>
          <InvoiceDoc v-bind="docProps" />
        </UCard>
      </div>

    </div>
  </div>

  <!-- ── Print-only clone (teleported to <body> direct child) ── -->
  <!-- Teleport is the only reliable way to avoid multi-page print issues. -->
  <!-- Uses printItems (empty rows stripped) instead of all items. -->
  <Teleport to="body">
    <div id="invoice-print">
      <InvoiceDoc v-bind="{ ...docProps, items: printItems }" />
    </div>
  </Teleport>
</template>

<style>
/* Screen: hide the teleported print clone */
#invoice-print { display: none; }

@media print {
  /* Remove browser URL / date / page-number chrome */
  @page { size: A4 portrait; margin: 0; }

  /* Hide ALL direct children of body except our print div */
  body > *:not(#invoice-print) { display: none !important; }

  #invoice-print {
    display: block !important;
    padding: 18mm 20mm;
    background: #ffffff;

    /* Force colours (teal bars, etc.) to print */
    print-color-adjust: exact !important;
    -webkit-print-color-adjust: exact !important;

    /* Force light-mode regardless of user's theme */
    color-scheme: light;
    --ui-text-highlighted: #111827;
    --ui-text-muted:       #6b7280;
    --ui-border:           #e5e7eb;
    --ui-bg:               #ffffff;
    --ui-bg-elevated:      #f9fafb;

    font-size: 11px;
    line-height: 1.5;
  }

  /* Teal colour utilities — explicit override for print */
  #invoice-print .bg-teal-500   { background-color: #14b8a6 !important; }
  #invoice-print .text-teal-500 { color: #14b8a6 !important; }

  /* Bill-To / dates meta box */
  #invoice-print .invoice-meta {
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px 12px;
  }

  /* Items table borders */
  #invoice-print table thead tr { border-bottom: 2px solid #111827 !important; }
  #invoice-print table tbody tr { border-bottom: 1px solid #e5e7eb !important; }

  /* Divider lines */
  #invoice-print .h-px { background-color: #e5e7eb !important; }
}
</style>
