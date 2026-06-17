<script setup lang="ts">
import type { CustomerRow } from '~/types'
import type { BusinessSettings } from '~/composables/useSettings'

export type DocItem = { _key: number; description: string; qty: number; unit_price: number }

defineProps<{
  invoiceNumber?: string | null
  isNew:          boolean
  customer:       CustomerRow | null
  issueDate:      string
  dueDate:        string
  payTerms:       string
  items:          DocItem[]
  subtotal:       number
  taxAmount:      number
  taxRate:        number
  total:          number
  discount:       number
  notes:          string
  today:          string
  settings?:      BusinessSettings | null
}>()

const rm = (n: number) => `RM ${Number(n).toFixed(2)}`
</script>

<template>
  <div class="space-y-5 text-sm">

    <!-- Brand header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <!-- Logo or wordmark -->
        <template v-if="settings?.logo_url">
          <img :src="settings.logo_url" alt="Logo" class="h-10 mb-1 object-contain" />
        </template>
        <template v-else>
          <div class="flex items-center gap-2 mb-1">
            <span
              class="w-[3px] h-4 rounded-full block"
              :style="{ background: settings?.accent_color ?? '#6366F1' }"
            />
            <span class="font-bold text-(--ui-text-highlighted)">{{ settings?.company_name ?? 'My Business' }}</span>
          </div>
        </template>
        <!-- Address lines -->
        <p v-if="settings?.address" class="text-xs text-(--ui-text-muted)">{{ settings.address }}</p>
        <p v-if="settings?.city" class="text-xs text-(--ui-text-muted)">
          {{ settings.city }}<template v-if="settings.postcode">, {{ settings.postcode }}</template>
        </p>
        <p v-if="settings?.country" class="text-xs text-(--ui-text-muted)">{{ settings.country }}</p>
        <p v-if="settings?.email" class="text-xs text-(--ui-text-muted)">{{ settings.email }}</p>
        <p v-if="settings?.phone" class="text-xs text-(--ui-text-muted)">{{ settings.phone }}</p>
        <p v-if="settings?.reg_number" class="text-xs text-(--ui-text-muted)">Reg: {{ settings.reg_number }}</p>
      </div>
      <div class="text-right">
        <p class="text-2xl font-bold text-(--ui-text-highlighted)">INVOICE</p>
        <p class="text-xs font-mono mt-0.5" :style="{ color: settings?.accent_color ?? '#6366F1' }">
          {{ isNew ? (settings?.invoice_prefix ?? 'INV') + '-' + new Date().getFullYear() + '-XXXX' : invoiceNumber }}
        </p>
      </div>
    </div>

    <div class="h-px bg-(--ui-border)" />

    <!-- Bill To + Dates -->
    <div class="invoice-meta grid grid-cols-2 gap-4">
      <div>
        <p class="text-[10px] uppercase tracking-wider text-(--ui-text-muted) mb-1">Bill To</p>
        <template v-if="customer">
          <p class="font-semibold text-(--ui-text-highlighted)">{{ customer.name }}</p>
          <p v-if="customer.email"   class="text-xs text-(--ui-text-muted)">{{ customer.email }}</p>
          <p v-if="customer.phone"   class="text-xs text-(--ui-text-muted)">{{ customer.phone }}</p>
          <p v-if="customer.address" class="text-xs text-(--ui-text-muted)">{{ customer.address }}</p>
          <p v-if="customer.city"    class="text-xs text-(--ui-text-muted)">{{ customer.city }}, {{ customer.postcode }}</p>
        </template>
        <p v-else class="text-xs text-(--ui-text-muted) italic">No customer selected</p>
      </div>
      <div class="text-right space-y-1">
        <div class="flex justify-between gap-4">
          <span class="text-[10px] uppercase tracking-wider text-(--ui-text-muted)">Issued</span>
          <span class="text-xs text-(--ui-text-highlighted)">{{ issueDate || today }}</span>
        </div>
        <div v-if="dueDate" class="flex justify-between gap-4">
          <span class="text-[10px] uppercase tracking-wider text-(--ui-text-muted)">Due</span>
          <span class="text-xs text-(--ui-text-highlighted)">{{ dueDate }}</span>
        </div>
        <div v-if="payTerms" class="flex justify-between gap-4">
          <span class="text-[10px] uppercase tracking-wider text-(--ui-text-muted)">Terms</span>
          <span class="text-xs text-(--ui-text-highlighted)">{{ payTerms }}</span>
        </div>
      </div>
    </div>

    <!-- Line items -->
    <table class="w-full text-xs">
      <thead>
        <tr class="border-b border-(--ui-border)">
          <th class="text-left py-2 text-(--ui-text-muted) font-medium">Description</th>
          <th class="text-center py-2 text-(--ui-text-muted) font-medium w-12">Qty</th>
          <th class="text-right py-2 text-(--ui-text-muted) font-medium w-20">Price</th>
          <th class="text-right py-2 text-(--ui-text-muted) font-medium w-20">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="item in items"
          :key="item._key"
          class="border-b border-(--ui-border)/50"
        >
          <td class="py-2 text-(--ui-text-highlighted)">{{ item.description || '—' }}</td>
          <td class="py-2 text-center text-(--ui-text-muted)">{{ item.qty }}</td>
          <td class="py-2 text-right text-(--ui-text-muted)">{{ rm(item.unit_price) }}</td>
          <td class="py-2 text-right text-(--ui-text-highlighted) font-medium">{{ rm(item.qty * item.unit_price) }}</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="space-y-1 ml-auto w-52">
      <div class="flex justify-between text-xs">
        <span class="text-(--ui-text-muted)">Subtotal</span>
        <span class="text-(--ui-text-highlighted)">{{ rm(subtotal) }}</span>
      </div>
      <div class="flex justify-between text-xs">
        <span class="text-(--ui-text-muted)">SST {{ taxRate }}%</span>
        <span class="text-(--ui-text-highlighted)">{{ rm(taxAmount) }}</span>
      </div>
      <div v-if="discount > 0" class="flex justify-between text-xs">
        <span class="text-(--ui-text-muted)">Discount</span>
        <span :style="{ color: settings?.accent_color ?? '#6366F1' }">-{{ rm(discount) }}</span>
      </div>
      <div class="flex justify-between font-bold border-t border-(--ui-border) pt-1.5 mt-1.5">
        <span class="text-(--ui-text-highlighted)">Total</span>
        <span :style="{ color: settings?.accent_color ?? '#6366F1' }">{{ rm(total) }}</span>
      </div>
    </div>

    <!-- Bank / Payment details -->
    <div
      v-if="settings?.bank_name || settings?.bank_account || settings?.duitnow_id"
      class="border border-(--ui-border) rounded-lg p-3 bg-(--ui-bg-elevated)"
    >
      <p class="text-[10px] uppercase tracking-wider text-(--ui-text-muted) mb-2">Payment Details</p>
      <div v-if="settings?.bank_name || settings?.bank_account" class="space-y-0.5">
        <p v-if="settings?.bank_name"    class="text-xs text-(--ui-text-highlighted)">{{ settings.bank_name }}</p>
        <p v-if="settings?.bank_holder"  class="text-xs text-(--ui-text-muted)">{{ settings.bank_holder }}</p>
        <p v-if="settings?.bank_account" class="text-xs font-mono text-(--ui-text-highlighted)">{{ settings.bank_account }}</p>
      </div>
      <div v-if="settings?.duitnow_id" class="mt-1.5 text-xs text-(--ui-text-muted)">
        DuitNow / FPX: <span class="font-mono text-(--ui-text-highlighted)">{{ settings.duitnow_id }}</span>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="notes" class="border-t border-(--ui-border) pt-3">
      <p class="text-[10px] uppercase tracking-wider text-(--ui-text-muted) mb-1">Notes</p>
      <p class="text-xs text-(--ui-text-muted) whitespace-pre-line">{{ notes }}</p>
    </div>

    <!-- Footer -->
    <div class="border-t border-(--ui-border) pt-3 text-center">
      <p class="text-[10px] text-(--ui-text-muted)">
        {{ settings?.company_name ?? 'My Business' }} · Thank you for your business
      </p>
    </div>

  </div>
</template>
