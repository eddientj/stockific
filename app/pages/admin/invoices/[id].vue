<script setup lang="ts">
import type { InvoiceRow, InvoiceItemPayload, CustomerRow, ProductRow } from '~/types'
import type { FieldDef } from '~/types/form'
import { useSettings } from '~/composables/useSettings'

export type DocItem = { _key: number; description: string; qty: number; unit_price: number }

type Payment = {
  id:         string
  invoice_id: string
  amount:     number
  method:     string
  reference:  string | null
  notes:      string | null
  paid_at:    string
  created_at: string
}

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
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

// ── Settings (for invoice header / bank details) ──────────────
const { settings } = useSettings()

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

// ── WhatsApp share ────────────────────────────────────────────
function shareWhatsApp() {
  const inv    = existing.value
  const name   = selectedCustomer.value?.name ?? 'there'
  const phone  = selectedCustomer.value?.phone?.replace(/\D/g, '') ?? ''
  const invNum = inv?.invoice_number ?? ''
  const amt    = `RM ${total.value.toFixed(2)}`
  const due    = dueDate.value ? ` Due: ${dueDate.value}.` : ''

  const msg = encodeURIComponent(
    `Hi ${name}, please find your invoice ${invNum} for ${amt}.${due} Thank you!`
  )

  // If we have a phone, pre-open their chat; otherwise just open WhatsApp with the message
  const base = phone ? `https://wa.me/${phone}` : 'https://wa.me'
  window.open(`${base}?text=${msg}`, '_blank')
}

// ── Helpers ───────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10)

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft', sent: 'Sent', paid: 'Paid', overdue: 'Overdue', cancelled: 'Cancelled', refunded: 'Refunded',
}
const STATUS_COLORS: Record<string, string> = {
  draft: 'text-(--ui-text-muted)', sent: 'text-sky-500', paid: 'text-brand-500',
  overdue: 'text-red-500', cancelled: 'text-(--ui-text-muted)', refunded: 'text-orange-500',
}

// ── More actions kebab menu ────────────────────────────────────
const moreActions = computed(() => {
  const actions = []

  if (status.value === 'sent') {
    actions.push({
      label: t('invf.markOverdue'),
      icon:  'i-lucide-clock-alert',
      onSelect() { save('overdue') },
    })
    actions.push({
      label: t('invf.revertDraft'),
      icon:  'i-lucide-rotate-ccw',
      onSelect() { save('draft') },
    })
  }

  if (status.value === 'overdue') {
    actions.push({
      label: t('invf.revertSent'),
      icon:  'i-lucide-rotate-ccw',
      onSelect() { save('sent') },
    })
  }

  if (status.value === 'cancelled') {
    actions.push({
      label: t('invf.revertDraft'),
      icon:  'i-lucide-rotate-ccw',
      onSelect() { save('draft') },
    })
  }

  if (status.value !== 'cancelled' && status.value !== 'paid') {
    if (actions.length) actions.push({ type: 'separator' as const })
    actions.push({
      label: t('invf.cancelInv'),
      icon:  'i-lucide-ban',
      color: 'error' as const,
      onSelect() { save('cancelled') },
    })
  }

  if (status.value === 'paid') {
    actions.push({
      label: t('invf.markRefunded'),
      icon:  'i-lucide-undo-2',
      color: 'error' as const,
      onSelect() { save('refunded') },
    })
  }

  return actions
})

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
  settings:      settings.value,
}))

// ── Payments ──────────────────────────────────────────────────
const { data: payments, refresh: refreshPayments } = isNew
  ? { data: ref<Payment[]>([]), refresh: async () => {} }
  : await useFetch<Payment[]>(`/api/invoices/${id}/payments`)

const totalPaid = computed(() =>
  (payments.value ?? []).reduce((s, p) => s + Number(p.amount), 0)
)

const paymentModalOpen = ref(false)

async function onPaymentSaved() {
  status.value = 'paid'
  await refreshPayments()
}

// ── Payment form ──────────────────────────────────────────────
const PAYMENT_FIELDS: FieldDef[] = [
  { name: 'amount',    label: 'Amount',                     type: 'readonly', span: 2 },
  { name: 'method',    label: 'Payment method',             type: 'select', required: true, options: [
    { label: 'Bank Transfer', value: 'Bank Transfer' },
    { label: 'FPX',           value: 'FPX'           },
    { label: 'DuitNow',       value: 'DuitNow'       },
    { label: 'Cash',          value: 'Cash'          },
    { label: 'Cheque',        value: 'Cheque'        },
    { label: 'Other',         value: 'Other'         },
  ]},
  { name: 'paid_at',   label: 'Payment date',               type: 'date', required: true },
  { name: 'reference', label: 'Reference / Transaction ID', type: 'text', placeholder: 'e.g. TXN1234567890', span: 2 },
  { name: 'notes',     label: 'Notes',                      type: 'textarea', placeholder: 'Optional notes…', rows: 2, span: 2 },
]

const paymentForm = ref({
  method:    'Bank Transfer',
  reference: '',
  notes:     '',
  paid_at:   new Date().toISOString().slice(0, 10),
})

watch(paymentModalOpen, (v) => {
  if (v) {
    paymentForm.value = {
      method:    'Bank Transfer',
      reference: '',
      notes:     '',
      paid_at:   new Date().toISOString().slice(0, 10),
    }
  }
})

const paymentFormData = computed(() => ({
  amount: `RM ${total.value.toFixed(2)}`,
  ...paymentForm.value,
}))

function onPaymentFormUpdate(data: Record<string, any>) {
  const { amount: _, ...rest } = data
  Object.assign(paymentForm.value, rest)
}

const savingPayment = ref(false)

async function savePayment() {
  savingPayment.value = true
  try {
    const payment = await $fetch<Payment>(`/api/invoices/${id}/payments`, {
      method: 'POST',
      body: {
        amount:    total.value,
        method:    paymentForm.value.method,
        reference: paymentForm.value.reference || null,
        notes:     paymentForm.value.notes     || null,
        paid_at:   new Date(paymentForm.value.paid_at).toISOString(),
      },
    })
    toast.add({ title: 'Payment recorded', color: 'success', icon: 'i-lucide-check' })
    await onPaymentSaved()
    paymentModalOpen.value = false
  } catch (e: any) {
    toast.add({ title: 'Failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    savingPayment.value = false
  }
}

const METHOD_ICONS: Record<string, string> = {
  'Cash':          'i-lucide-banknote',
  'Bank Transfer': 'i-lucide-landmark',
  'FPX':           'i-lucide-smartphone',
  'DuitNow':       'i-lucide-qr-code',
  'Cheque':        'i-lucide-file-text',
  'Other':         'i-lucide-circle-ellipsis',
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
            {{ isNew ? t('invf.new') : existing?.invoice_number }}
          </h1>
          <p v-if="!isNew" class="text-xs text-(--ui-text-muted)">
            {{ t('invf.lastUpdated') }} {{ existing?.updated_at?.slice(0, 10) }}
            ·
            <span :class="STATUS_COLORS[status]">{{ STATUS_LABELS[status] }}</span>
          </p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <!-- Ghost icon actions -->
        <UTooltip v-if="!isNew" :text="t('invf.whatsapp')">
          <UButton icon="i-lucide-message-circle" variant="ghost" color="neutral" size="sm" @click="shareWhatsApp" />
        </UTooltip>
        <UTooltip :text="t('invf.print')">
          <UButton icon="i-lucide-printer" variant="ghost" color="neutral" size="sm" @click="printInvoice" />
        </UTooltip>

        <!-- More actions kebab (saved invoices only) -->
        <UDropdownMenu
          v-if="!isNew"
          :items="moreActions"
        >
          <UButton icon="i-lucide-ellipsis" variant="ghost" color="neutral" size="sm" />
        </UDropdownMenu>

        <!-- Primary status-progression button -->
        <UButton
          v-if="!isNew && status === 'draft'"
          variant="outline"
          color="neutral"
          size="sm"
          :loading="saving"
          @click="save('sent')"
        >
          {{ t('invf.markSent') }}
        </UButton>
        <UButton
          v-if="!isNew && (status === 'sent' || status === 'overdue')"
          variant="outline"
          color="success"
          size="sm"
          icon="i-lucide-check"
          @click="paymentModalOpen = true"
        >
          {{ t('invf.markPaid') }}
        </UButton>

        <UButton icon="i-lucide-save" size="sm" :loading="saving" @click="save()">
          {{ isNew ? t('invf.create') : t('invf.save') }}
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
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('invf.details') }}</p>
          </template>
          <div class="space-y-4">
            <UFormField :label="t('invf.customer')" name="customer">
              <USelectMenu
                v-model="selectedCustomerId"
                :items="(customers ?? []).map(c => ({ label: c.name, value: c.id, description: c.email ?? '' }))"
                value-key="value"
                :placeholder="t('invf.selectCust')"
                searchable
                :searchable-placeholder="t('invf.searchCust')"
                class="w-full"
              >
                <template #trailing>
                  <UButton icon="i-lucide-user-plus" variant="ghost" color="neutral" size="xs" to="/admin/customers?create=1" :title="t('invf.addNewCust')" @click.stop />
                </template>
              </USelectMenu>
            </UFormField>

            <div class="grid grid-cols-2 gap-3">
              <AppField :field="{ name: 'issue_date', label: t('invf.issueDate'), type: 'date' }" :model-value="issueDate" @update:model-value="issueDate = $event" />
              <UFormField :label="t('invf.payTerms')" name="pay_terms">
                <USelectMenu v-model="payTerms" :items="PAY_TERMS" class="w-full" />
              </UFormField>
            </div>

            <AppField :field="{ name: 'due_date', label: t('invf.dueDate'), type: 'date' }" :model-value="dueDate" @update:model-value="dueDate = $event" />
          </div>
        </UCard>

        <!-- Line items -->
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold text-(--ui-text-highlighted)">{{ t('invf.lineItems') }}</p>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" size="xs" @click="addItem">{{ t('invf.addItem') }}</UButton>
            </div>
          </template>

          <div class="space-y-2">
            <div v-for="(item, idx) in items" :key="item._key" class="rounded-lg border border-(--ui-border) bg-(--ui-bg-elevated) p-3 space-y-3">
              <div class="flex items-center justify-between">
                <span class="text-xs font-medium text-(--ui-text-muted)">{{ t('invf.item') }} {{ idx + 1 }}</span>
                <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="xs" :disabled="items.length <= 1" @click="removeItem(item._key)" />
              </div>
              <USelectMenu
                :items="(products ?? []).filter(p => p.is_active).map(p => ({ label: p.name, value: p.id, description: `RM ${p.price.toFixed(2)}` }))"
                value-key="value"
                :placeholder="t('invf.quickFill')"
                searchable
                :searchable-placeholder="t('invf.searchProds')"
                class="w-full"
                @update:model-value="fillFromProduct(item, $event as string)"
              />
              <UFormField :label="t('invf.description')">
                <UInput v-model="item.description" :placeholder="t('invf.itemDesc')" class="w-full" />
              </UFormField>
              <div class="grid grid-cols-2 gap-2">
                <AppField :field="{ name: 'qty', label: t('invf.qty'), type: 'number', min: 0.01, max: 99999, decimals: 2 }" :model-value="item.qty" @update:model-value="item.qty = $event" />
                <AppField :field="{ name: 'price', label: t('invf.unitPrice'), type: 'number', min: 0, max: 99999, decimals: 2, mono: true }" :model-value="item.unit_price" @update:model-value="item.unit_price = $event" />
              </div>
            </div>
          </div>

          <!-- Totals -->
          <div class="mt-4 pt-4 border-t border-(--ui-border) space-y-1.5 text-sm">
            <div class="flex justify-between">
              <span class="text-(--ui-text-muted)">{{ t('invf.subtotal') }}</span>
              <span class="text-(--ui-text-highlighted)">RM {{ subtotal.toFixed(2) }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-(--ui-text-muted)">{{ t('invf.tax') }}</span>
                <UInput
                  :value="taxRate"
                  type="number" min="0" max="100" step="0.1" placeholder="6"
                  class="w-20 h-7 text-xs"
                  @keydown="(e: KeyboardEvent) => ['e','E','+','-'].includes(e.key) && e.preventDefault()"
                  @input="(e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(v)) taxRate = Math.min(100, Math.max(0, +v.toFixed(1))) }"
                />
              </div>
              <span class="text-(--ui-text-highlighted)">RM {{ taxAmount.toFixed(2) }}</span>
            </div>
            <div class="flex items-center justify-between gap-2">
              <div class="flex items-center gap-2">
                <span class="text-(--ui-text-muted)">{{ t('invf.discount') }}</span>
                <UInput
                  :value="discount"
                  type="number" min="0" max="99999" step="0.01" placeholder="0.00"
                  class="w-20 h-7 text-xs"
                  @keydown="(e: KeyboardEvent) => ['e','E','+','-'].includes(e.key) && e.preventDefault()"
                  @input="(e: Event) => { const v = parseFloat((e.target as HTMLInputElement).value); if (!isNaN(v)) discount = Math.min(99999, Math.max(0, +v.toFixed(2))) }"
                />
              </div>
              <span :class="discount > 0 ? 'text-brand-500' : 'text-(--ui-text-muted)'" class="text-xs">
                {{ discount > 0 ? `-RM ${discount.toFixed(2)}` : '—' }}
              </span>
            </div>
            <div class="flex justify-between font-semibold pt-1 border-t border-(--ui-border)">
              <span class="text-(--ui-text-highlighted)">{{ t('invf.total') }}</span>
              <span class="text-brand-500 text-base">RM {{ total.toFixed(2) }}</span>
            </div>
          </div>
        </UCard>

        <!-- Notes -->
        <UCard>
          <template #header>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('invf.notesTerms') }}</p>
          </template>
          <UTextarea
            v-model="notes"
            :placeholder="t('invf.notesHint')"
            :rows="4"
            class="w-full"
          />
        </UCard>

        <!-- ── Payment history (only when payments exist) ──────── -->
        <UCard v-if="!isNew && payments?.length">
          <template #header>
            <div class="flex items-center justify-between">
              <p class="font-semibold text-(--ui-text-highlighted)">{{ t('invf.payments') }}</p>
              <span class="text-xs font-mono font-medium text-brand-500">
                RM {{ totalPaid.toFixed(2) }} {{ t('invf.paid') }}
              </span>
            </div>
          </template>

          <!-- Warning banner for cancelled / refunded -->
          <div
            v-if="status === 'cancelled' || status === 'refunded'"
            class="mb-3 flex items-start gap-2 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20 px-3 py-2.5 text-xs text-orange-700 dark:text-orange-400"
          >
            <UIcon name="i-lucide-triangle-alert" class="size-3.5 shrink-0 mt-0.5" />
            <span>
              This invoice is <strong>{{ STATUS_LABELS[status] }}</strong> — these payments are
              <strong>excluded from reports</strong> and revenue totals.
            </span>
          </div>

          <div class="divide-y divide-(--ui-border)">
            <div
              v-for="p in payments"
              :key="p.id"
              class="flex items-start justify-between gap-3 py-2.5"
            >
              <div class="flex items-center gap-2.5">
                <UIcon
                  :name="METHOD_ICONS[p.method] ?? 'i-lucide-circle-ellipsis'"
                  class="size-4 text-(--ui-text-muted) shrink-0 mt-0.5"
                />
                <div>
                  <p class="text-sm text-(--ui-text-highlighted)">{{ p.method }}</p>
                  <p class="text-xs text-(--ui-text-muted)">
                    {{ p.paid_at.slice(0, 10) }}
                    <template v-if="p.reference"> · <span class="font-mono">{{ p.reference }}</span></template>
                  </p>
                  <p v-if="p.notes" class="text-xs text-(--ui-text-muted) italic mt-0.5">{{ p.notes }}</p>
                </div>
              </div>
              <span class="font-mono font-semibold text-sm text-brand-500 shrink-0">
                RM {{ Number(p.amount).toFixed(2) }}
              </span>
            </div>
          </div>
        </UCard>

      </div>

      <!-- ════════════ PREVIEW SIDE (screen only) ════════════ -->
      <div class="xl:sticky xl:top-6">
        <UCard>
          <template #header>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('invf.preview') }}</p>
          </template>
          <InvoiceDoc v-bind="docProps" />
        </UCard>
      </div>

    </div>
  </div>

  <!-- ── Record Payment slideover ─────────────────────────────── -->
  <AppFormSlideover
    v-if="!isNew && id"
    :title="t('invf.recordPayment')"
    :fields="PAYMENT_FIELDS"
    :model-value="paymentFormData"
    v-model:open="paymentModalOpen"
    :loading="savingPayment"
    :save-label="t('invf.confirmPay')"
    @update:model-value="onPaymentFormUpdate"
    @save="savePayment"
  />

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

    /* Force colours (indigo bars, etc.) to print */
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

  /* brand colour utilities — explicit override for print */
  #invoice-print .bg-brand-500   { background-color: var(--color-brand-500) !important; }
  #invoice-print .text-brand-500 { color: var(--color-brand-500) !important; }

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
