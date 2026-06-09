<script setup lang="ts">
import type { CustomerRow } from '~/types'

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
}>()

const rm = (n: number) => `RM ${Number(n).toFixed(2)}`
</script>

<template>
  <div class="space-y-5 text-sm">

    <!-- Brand header -->
    <div class="flex items-start justify-between gap-4">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="w-[3px] h-4 rounded-full block bg-teal-500" />
          <span class="font-bold text-(--ui-text-highlighted)">Stockific</span>
        </div>
        <p class="text-xs text-(--ui-text-muted)">Your Business Name</p>
        <p class="text-xs text-(--ui-text-muted)">Kuala Lumpur, Malaysia</p>
      </div>
      <div class="text-right">
        <p class="text-2xl font-bold text-(--ui-text-highlighted)">INVOICE</p>
        <p class="text-xs font-mono text-teal-500 mt-0.5">
          {{ isNew ? 'INV-' + new Date().getFullYear() + '-XXXX' : invoiceNumber }}
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
        <span class="text-teal-500">-{{ rm(discount) }}</span>
      </div>
      <div class="flex justify-between font-bold border-t border-(--ui-border) pt-1.5 mt-1.5">
        <span class="text-(--ui-text-highlighted)">Total</span>
        <span class="text-teal-500">{{ rm(total) }}</span>
      </div>
    </div>

    <!-- Notes -->
    <div v-if="notes" class="border-t border-(--ui-border) pt-3">
      <p class="text-[10px] uppercase tracking-wider text-(--ui-text-muted) mb-1">Notes</p>
      <p class="text-xs text-(--ui-text-muted) whitespace-pre-line">{{ notes }}</p>
    </div>

    <!-- Footer -->
    <div class="border-t border-(--ui-border) pt-3 text-center">
      <p class="text-[10px] text-(--ui-text-muted)">Generated by Stockific · Thank you for your business</p>
    </div>

  </div>
</template>
