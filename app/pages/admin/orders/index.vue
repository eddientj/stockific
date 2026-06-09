<script setup lang="ts">
import { useOrders, ORDER_STATUS_CFG, buildOrderTimeline } from '~/composables/useOrders'
import type { OrderStatus } from '~/data/mockOrders'

definePageMeta({ layout: 'admin' })

const {
  search, statusFilter, filtered,
  countByStatus, totalRevenue,
  selected, slideOpen, openDetail,
  advanceStatus, orderTotal, rm,
} = useOrders()

// Build chip list for AppStatusChips
const statusChips = computed(() =>
  (Object.keys(ORDER_STATUS_CFG) as OrderStatus[]).map(key => ({
    key,
    count: countByStatus.value[key],
    color: ORDER_STATUS_CFG[key].color,
    bg:    ORDER_STATUS_CFG[key].bg,
  }))
)

// Compute timeline once when selected changes (avoids calling in template)
const selectedTimeline = computed(() =>
  selected.value ? buildOrderTimeline(selected.value.status) : []
)
</script>

<template>
  <section class="space-y-6">

    <AppPageHeader title="Orders" description="View and manage customer orders." />

    <!-- Status chips -->
    <AppStatusChips
      v-model="statusFilter"
      :chips="statusChips"
    />

    <!-- Toolbar -->
    <div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
      <UInput v-model="search" icon="i-lucide-search" placeholder="Search orders, customers…" class="w-full sm:w-72" />
      <div class="flex items-center gap-2">
        <span class="text-sm text-(--ui-text-muted)">{{ filtered.length }} orders</span>
        <UButton v-if="statusFilter !== 'all'" size="xs" variant="soft" color="neutral" icon="i-lucide-x" @click="statusFilter = 'all'">
          Clear filter
        </UButton>
      </div>
    </div>

    <!-- Table -->
    <AppListTable :row-count="filtered.length">
      <template #head>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap">Order</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">Customer</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap hidden sm:table-cell">Date</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted) hidden md:table-cell">Items</th>
        <th class="text-right px-4 py-3 font-medium text-(--ui-text-muted) whitespace-nowrap">Amount</th>
        <th class="text-left px-4 py-3 font-medium text-(--ui-text-muted)">Status</th>
        <th class="px-4 py-3 w-10" />
      </template>

      <!-- Rows -->
      <tr
        v-for="o in filtered"
        :key="o.id"
        class="border-b border-(--ui-border) last:border-0 hover:bg-(--ui-bg-elevated) transition-colors cursor-pointer"
        @click="openDetail(o)"
      >
        <td class="px-4 py-3">
          <span class="font-mono text-xs font-semibold text-(--ui-text-highlighted)">{{ o.id }}</span>
        </td>
        <td class="px-4 py-3">
          <div class="flex items-center gap-2.5">
            <div class="w-7 h-7 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
              <span class="text-[10px] font-bold text-(--ui-text-muted)">{{ o.customer.split(' ').map((w: string) => w[0]).join('').slice(0, 2) }}</span>
            </div>
            <div class="min-w-0">
              <p class="font-medium text-(--ui-text-highlighted) truncate leading-tight">{{ o.customer }}</p>
              <p class="text-xs text-(--ui-text-muted) truncate">{{ o.email }}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3 text-(--ui-text-muted) whitespace-nowrap hidden sm:table-cell">{{ o.date }}</td>
        <td class="px-4 py-3 hidden md:table-cell">
          <span class="text-(--ui-text-muted)">
            {{ o.items.reduce((s: number, i: any) => s + i.qty, 0) }} item{{ o.items.reduce((s: number, i: any) => s + i.qty, 0) > 1 ? 's' : '' }}
          </span>
        </td>
        <td class="px-4 py-3 text-right font-semibold text-(--ui-text-highlighted) whitespace-nowrap">
          {{ rm(orderTotal(o)) }}
        </td>
        <td class="px-4 py-3">
          <span
            class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
            :class="[ORDER_STATUS_CFG[o.status].color, ORDER_STATUS_CFG[o.status].bg]"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="ORDER_STATUS_CFG[o.status].dot" />
            {{ o.status }}
          </span>
        </td>
        <td class="px-4 py-3">
          <UIcon name="i-lucide-chevron-right" class="size-4 text-(--ui-text-muted)" />
        </td>
      </tr>

      <!-- Empty -->
      <template #empty>
        <div class="py-16 text-center">
          <UIcon name="i-lucide-search-x" class="size-10 text-(--ui-text-muted) mx-auto mb-3" />
          <p class="font-medium text-(--ui-text-highlighted)">No orders found</p>
          <p class="text-sm text-(--ui-text-muted) mt-1">Try a different search or filter.</p>
        </div>
      </template>
    </AppListTable>

    <!-- Revenue footnote -->
    <p class="text-xs text-(--ui-text-muted) text-right">
      Total across all orders: <span class="font-semibold text-(--ui-text-highlighted)">{{ rm(totalRevenue) }}</span>
    </p>

    <!-- ── Order detail slideover ─────────────────────────────── -->
    <USlideover v-model:open="slideOpen" side="right" class="max-w-lg">
      <template #content>
        <div v-if="selected" class="flex flex-col h-full overflow-y-auto">

          <!-- Header -->
          <div class="px-6 py-5 border-b border-(--ui-border) flex items-start justify-between gap-4 shrink-0">
            <div>
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-sm font-bold text-(--ui-text-highlighted)">{{ selected.id }}</span>
                <span
                  class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                  :class="[ORDER_STATUS_CFG[selected.status].color, ORDER_STATUS_CFG[selected.status].bg]"
                >
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="ORDER_STATUS_CFG[selected.status].dot" />
                  {{ selected.status }}
                </span>
              </div>
              <p class="text-sm text-(--ui-text-muted)">Placed on {{ selected.date }}</p>
            </div>
            <UButton icon="i-lucide-x" variant="ghost" color="neutral" size="sm" @click="slideOpen = false" />
          </div>

          <!-- Body -->
          <div class="flex-1 px-6 py-5 space-y-6">

            <!-- Timeline -->
            <div>
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Order progress</p>
              <div class="flex items-center">
                <template v-for="(step, i) in selectedTimeline" :key="step.label">
                  <div class="flex flex-col items-center gap-1 flex-1">
                    <div
                      class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-colors"
                      :class="step.done
                        ? (selected.status === 'Cancelled' && i === 1 ? 'bg-red-500 border-red-500' : 'bg-teal-500 border-teal-500')
                        : 'bg-(--ui-bg) border-(--ui-border)'"
                    >
                      <UIcon :name="step.icon" class="size-3.5" :class="step.done ? 'text-white' : 'text-(--ui-text-muted)'" />
                    </div>
                    <span class="text-[10px] text-center leading-tight" :class="step.done ? 'text-(--ui-text-highlighted) font-medium' : 'text-(--ui-text-muted)'">
                      {{ step.label }}
                    </span>
                  </div>
                  <div
                    v-if="i < selectedTimeline.length - 1"
                    class="h-0.5 flex-1 mb-5 rounded-full"
                    :class="selectedTimeline[i + 1]?.done ? 'bg-teal-500' : 'bg-(--ui-border)'"
                  />
                </template>
              </div>
            </div>

            <!-- Customer info -->
            <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) p-4 space-y-2">
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider">Customer</p>
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-full bg-(--ui-bg) border border-(--ui-border) flex items-center justify-center shrink-0">
                  <span class="text-xs font-bold text-(--ui-text-muted)">
                    {{ selected.customer.split(' ').map((w: string) => w[0]).join('').slice(0, 2) }}
                  </span>
                </div>
                <div>
                  <p class="font-semibold text-(--ui-text-highlighted)">{{ selected.customer }}</p>
                  <p class="text-xs text-(--ui-text-muted)">{{ selected.email }}</p>
                </div>
              </div>
              <div class="flex items-center gap-2 pt-1">
                <UIcon name="i-lucide-phone" class="size-3.5 text-(--ui-text-muted)" />
                <span class="text-sm text-(--ui-text-muted)">{{ selected.phone }}</span>
              </div>
              <div class="flex items-start gap-2">
                <UIcon name="i-lucide-map-pin" class="size-3.5 text-(--ui-text-muted) mt-0.5" />
                <span class="text-sm text-(--ui-text-muted)">{{ selected.address }}, {{ selected.city }}, {{ selected.postcode }}</span>
              </div>
              <div v-if="selected.notes" class="flex items-start gap-2 pt-1 border-t border-(--ui-border) mt-2">
                <UIcon name="i-lucide-message-square" class="size-3.5 text-(--ui-text-muted) mt-0.5 shrink-0" />
                <span class="text-sm text-(--ui-text-muted) italic">{{ selected.notes }}</span>
              </div>
            </div>

            <!-- Items -->
            <div>
              <p class="text-xs font-semibold text-(--ui-text-muted) uppercase tracking-wider mb-3">Items</p>
              <div class="rounded-xl border border-(--ui-border) overflow-hidden">
                <div v-for="(item, idx) in selected.items" :key="idx" class="flex items-center gap-3 px-4 py-3 border-b border-(--ui-border) last:border-0">
                  <div class="w-9 h-9 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
                    <UIcon name="i-lucide-package" class="size-4 text-(--ui-text-muted)" />
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ item.name }}</p>
                    <p class="text-xs text-(--ui-text-muted)">{{ item.variant }} · qty {{ item.qty }}</p>
                  </div>
                  <p class="text-sm font-semibold text-(--ui-text-highlighted) whitespace-nowrap">{{ rm(item.price * item.qty) }}</p>
                </div>
              </div>
            </div>

            <!-- Totals -->
            <div class="rounded-xl border border-(--ui-border) bg-(--ui-bg-elevated) divide-y divide-(--ui-border)">
              <div class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-(--ui-text-muted)">Subtotal</span>
                <span class="text-(--ui-text-highlighted)">{{ rm(selected.items.reduce((s: number, i: any) => s + i.price * i.qty, 0)) }}</span>
              </div>
              <div class="flex justify-between px-4 py-2.5 text-sm">
                <span class="text-(--ui-text-muted)">Shipping</span>
                <span :class="selected.shipping === 0 ? 'text-teal-500 font-medium' : 'text-(--ui-text-highlighted)'">
                  {{ selected.shipping === 0 ? 'Free' : rm(selected.shipping) }}
                </span>
              </div>
              <div class="flex justify-between px-4 py-3 font-semibold">
                <span class="text-(--ui-text-highlighted)">Total</span>
                <span class="text-teal-500">{{ rm(orderTotal(selected)) }}</span>
              </div>
            </div>

          </div>

          <!-- Footer actions -->
          <div class="px-6 py-4 border-t border-(--ui-border) flex gap-3 shrink-0">
            <UButton v-if="selected.status === 'Pending'"   icon="i-lucide-check-circle"  class="flex-1" @click="advanceStatus(selected.id)">Confirm Order</UButton>
            <UButton v-if="selected.status === 'Confirmed'" icon="i-lucide-truck"          class="flex-1" @click="advanceStatus(selected.id)">Mark Shipped</UButton>
            <UButton v-if="selected.status === 'Shipped'"   icon="i-lucide-package-check" class="flex-1" @click="advanceStatus(selected.id)">Mark Delivered</UButton>
            <UButton v-if="selected.status === 'Delivered'" icon="i-lucide-check"          class="flex-1" variant="soft" color="success" disabled>Delivered</UButton>
            <UButton variant="outline" color="neutral" icon="i-lucide-printer">Print</UButton>
          </div>

        </div>
      </template>
    </USlideover>

  </section>
</template>
