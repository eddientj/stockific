<script setup lang="ts">
import type { ProductRow } from '~/types'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()

// ── Live data ─────────────────────────────────────────────
const [{ data: products }, { data: dash }, { data: crm }] = await Promise.all([
  useFetch<ProductRow[]>('/api/products'),
  useFetch<{
    totalOrders: number
    totalRevenue: number
    currentRevenue: number
    revenueChange: number
    ordersByStatus: Record<string, number>
    revenueChart: { date: string; revenue: number }[]
    recentOrders: { id: string; order_number: string; customer_name: string; status: string; total: number; item_count: number; created_at: string }[]
  }>('/api/dashboard'),
  useFetch<{
    pipeline: { id: string; name: string; color: string; is_closed_won: boolean; is_closed_lost: boolean; count: number; value: number }[]
    unassigned: number
    totalLeads: number
    totalValue: number
    followUps: { id: string; name: string; stage: { name: string; color: string } | null; value: number | null; created_at: string; daysIdle: number }[]
  }>('/api/dashboard/crm'),
])

// ── Inventory from products ───────────────────────────────
const liveStock = (p: ProductRow) =>
  (p.variants ?? []).reduce((s, v) => s + v.stock_quantity - v.stock_on_hold, 0)

const totalProducts = computed(() => products.value?.length ?? 0)

const lowStockItems = computed(() =>
  (products.value ?? [])
    .filter(p => (p.variants ?? []).some(v => v.reorder_level > 0 && (v.stock_quantity - v.stock_on_hold) <= v.reorder_level))
    .sort((a, b) => liveStock(a) - liveStock(b))
    .slice(0, 6)
)

const outOfStockCount = computed(() =>
  (products.value ?? []).filter(p => liveStock(p) === 0).length
)

// ── Dashboard KPIs ────────────────────────────────────────
const totalOrders   = computed(() => dash.value?.totalOrders   ?? 0)
const totalRevenue  = computed(() => dash.value?.currentRevenue ?? 0)
const revenueChange = computed(() => dash.value?.revenueChange  ?? 0)

const ORDER_STATUS_CFG: Record<string, { bg: string }> = {
  Delivered: { bg: 'bg-brand-500'    },
  Shipped:   { bg: 'bg-sky-500'    },
  Confirmed: { bg: 'bg-violet-500' },
  Pending:   { bg: 'bg-amber-500'  },
}
const ORDER_STATUS_DOT: Record<string, string> = {
  Delivered: 'bg-brand-400',
  Shipped:   'bg-sky-400',
  Confirmed: 'bg-violet-400',
  Pending:   'bg-amber-400',
  Cancelled: 'bg-red-400',
}

const orderStatus = computed(() =>
  (['Delivered', 'Shipped', 'Confirmed', 'Pending'] as const).map(label => ({
    label,
    count: dash.value?.ordersByStatus[label] ?? 0,
    bg:    ORDER_STATUS_CFG[label]!.bg,
  }))
)

const totalDisplayOrders = computed(() => orderStatus.value.reduce((s, o) => s + o.count, 0))

const recentOrders = computed(() =>
  (dash.value?.recentOrders ?? []).map(o => ({
    id:       o.order_number,
    customer: o.customer_name,
    items:    o.item_count,
    amount:   o.total,
    status:   o.status,
    dotClass: ORDER_STATUS_DOT[o.status] ?? 'bg-gray-400',
  }))
)

// ── Revenue sparkline ─────────────────────────────────────
const SVG_W = 560
const SVG_H = 72

const revenue30d = computed(() =>
  (dash.value?.revenueChart ?? []).map(d => d.revenue)
)

const maxR = computed(() => Math.max(...revenue30d.value, 1))
const minR = computed(() => Math.min(...revenue30d.value) * 0.8)

function ry(v: number, max: number, min: number) {
  return SVG_H - ((v - min) / (max - min || 1)) * SVG_H * 0.88
}

const chartPts = computed(() =>
  revenue30d.value.map((v, i) => ({
    x: (i / Math.max(revenue30d.value.length - 1, 1)) * SVG_W,
    y: ry(v, maxR.value, minR.value),
  }))
)

const polyline = computed(() => chartPts.value.map(p => `${p.x},${p.y}`).join(' '))
const fillPath = computed(() => {
  const pts = chartPts.value
  if (!pts.length) return ''
  const first = pts[0]!
  const last  = pts[pts.length - 1]!
  return `M${first.x},${SVG_H} ${pts.map(p => `L${p.x},${p.y}`).join(' ')} L${last.x},${SVG_H} Z`
})

// ── Batch expiry (premium+) ───────────────────────────────
const { canAccess } = useOrg()
const { data: expiringLots } = await useFetch<any[]>('/api/lots', {
  query: { expiring_days: 30 },
  default: () => [],
})

// ── CRM ───────────────────────────────────────────────────
const pipeline     = computed(() => crm.value?.pipeline   ?? [])
const followUps    = computed(() => crm.value?.followUps  ?? [])
const totalLeads   = computed(() => crm.value?.totalLeads ?? 0)
const totalValue   = computed(() => crm.value?.totalValue ?? 0)
const maxStageCount = computed(() => Math.max(...pipeline.value.map(s => s.count), 1))

// ── Helpers ───────────────────────────────────────────────
const rm  = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
const rmK = (n: number) => n >= 1000 ? `RM ${(n / 1000).toFixed(1)}k` : rm(n)
</script>

<template>
  <div class="space-y-6">

    <!-- ── Page header ──────────────────────────────────── -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-(--ui-text-highlighted)">{{ t('dash.title') }}</h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">{{ t('dash.subtitle') }}</p>
      </div>
      <span class="text-xs text-(--ui-text-muted) mt-1.5">{{ t('dash.last30') }}</span>
    </div>

    <!-- ── Stat cards ────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

      <!-- Revenue -->
      <UCard class="stat-card">
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-circle-dollar-sign" class="size-4 text-brand-500" />
          </div>
          <span class="text-xs font-medium text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-lucide-trending-up" class="size-3" />
            +{{ revenueChange }}%
          </span>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
          {{ rmK(totalRevenue) }}
        </p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('dash.revenue') }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('dash.totalRevenue') }}</p>
      </UCard>

      <!-- Orders -->
      <UCard class="stat-card">
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-shopping-cart" class="size-4 text-violet-500" />
          </div>
          <NuxtLink to="/admin/orders" class="text-xs text-(--ui-text-muted) hover:text-(--ui-text) transition-colors">
            View →
          </NuxtLink>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ totalOrders }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('dash.totalOrders') }}</p>
      </UCard>

      <!-- Products -->
      <UCard class="stat-card">
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-package" class="size-4 text-sky-500" />
          </div>
          <NuxtLink to="/admin/products" class="text-xs text-(--ui-text-muted) hover:text-(--ui-text) transition-colors">
            View →
          </NuxtLink>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ totalProducts }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('dash.activeProducts') }}</p>
      </UCard>

      <!-- Alerts -->
      <UCard class="stat-card">
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-triangle-alert" class="size-4 text-amber-500" />
          </div>
          <span v-if="outOfStockCount > 0" class="text-xs font-medium text-red-500">
            {{ outOfStockCount }} out
          </span>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ lowStockItems.length }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('dash.lowStock') }}</p>
      </UCard>

    </div>

    <!-- ── Charts row ─────────────────────────────────────── -->
    <div class="grid lg:grid-cols-3 gap-4">

      <!-- Revenue sparkline -->
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-(--ui-text-highlighted)">{{ t('dash.revenueChart') }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ t('dash.dailyRevenue') }}</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-brand-500">{{ rm(totalRevenue) }}</p>

              <p class="text-xs" :class="revenueChange >= 0 ? 'text-emerald-500' : 'text-red-400'">
              {{ t('dash.vsPrev') }}
            </p>
            </div>
          </div>
        </template>

        <div class="pt-2">
          <svg
            :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
            class="w-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"   stop-color="var(--color-brand-500)" stop-opacity="0.25" />
                <stop offset="100%" stop-color="var(--color-brand-500)" stop-opacity="0"    />
              </linearGradient>
            </defs>
            <!-- Horizontal grid lines -->
            <line v-for="n in 3" :key="n" :x1="0" :x2="SVG_W" :y1="(SVG_H / 3) * n" :y2="(SVG_H / 3) * n"
              stroke="currentColor" class="text-(--ui-border)" stroke-width="0.5" />
            <!-- Fill -->
            <path :d="fillPath || ''" fill="url(#revGrad)" />
            <!-- Line -->
            <polyline :points="polyline || ''" fill="none" stroke="var(--color-brand-500)" stroke-width="2"
              stroke-linejoin="round" stroke-linecap="round" />
          </svg>

          <!-- X-axis labels (first, middle, last) -->
          <div class="flex justify-between mt-2">
            <span class="text-[10px] text-(--ui-text-muted)">30 days ago</span>
            <span class="text-[10px] text-(--ui-text-muted)">15 days ago</span>
            <span class="text-[10px] text-(--ui-text-muted)">Today</span>
          </div>
        </div>
      </UCard>

      <!-- Order breakdown -->
      <UCard>
        <template #header>
          <div>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('dash.ordersChart') }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ t('dash.breakdownStatus') }}</p>
          </div>
        </template>

        <!-- Total -->
        <div class="text-center mb-5">
          <p class="text-4xl font-bold text-(--ui-text-highlighted)">{{ totalDisplayOrders }}</p>
          <p class="text-xs text-(--ui-text-muted) mt-1">{{ t('dash.activeOrders') }}</p>
        </div>

        <!-- Stacked bar -->
        <div class="h-2 rounded-full overflow-hidden flex mb-4">
          <div
            v-for="s in orderStatus"
            :key="s.label"
            :class="s.bg"
            :style="{ width: `${totalDisplayOrders > 0 ? (s.count / totalDisplayOrders) * 100 : 0}%` }"
          />
        </div>

        <!-- Legend -->
        <div class="space-y-2.5">
          <div v-for="s in orderStatus" :key="s.label" class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full" :class="s.bg" />
              <span class="text-sm text-(--ui-text-muted)">{{ s.label }}</span>
            </div>
            <div class="flex items-center gap-3">
              <div class="w-16 h-1.5 rounded-full bg-(--ui-bg-elevated) overflow-hidden">
                <div
                  :class="s.bg"
                  :style="{ width: `${totalDisplayOrders > 0 ? (s.count / totalDisplayOrders) * 100 : 0}%` }"
                  class="h-full rounded-full"
                />
              </div>
              <span class="text-sm font-medium text-(--ui-text-highlighted) w-5 text-right">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <NuxtLink
          to="/admin/orders"
          class="block mt-5 text-center text-xs text-(--ui-text-muted) hover:text-brand-500 transition-colors"
        >
          {{ t('dash.viewAllOrders') }}
        </NuxtLink>
      </UCard>
    </div>

    <!-- ── CRM row ──────────────────────────────────────────── -->
    <div class="grid lg:grid-cols-3 gap-4">

      <!-- Pipeline overview -->
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-(--ui-text-highlighted)">Pipeline Overview</p>
              <p class="text-xs text-(--ui-text-muted)">Open leads by stage</p>
            </div>
            <div class="text-right">
              <p class="text-sm font-bold text-(--ui-text-highlighted)">{{ totalLeads }} leads</p>
              <p class="text-xs text-(--ui-text-muted)">{{ rmK(totalValue) }} total value</p>
            </div>
          </div>
        </template>

        <div v-if="pipeline.length === 0" class="py-8 text-center text-sm text-(--ui-text-muted)">
          No pipeline stages yet.
          <NuxtLink to="/admin/leads/pipeline" class="text-brand-500 hover:underline ml-1">Set up stages →</NuxtLink>
        </div>

        <div v-else class="space-y-3">
          <div v-for="stage in pipeline" :key="stage.id" class="flex items-center gap-3">
            <div class="w-2.5 h-2.5 rounded-full shrink-0" :style="{ background: stage.color }" />
            <span class="text-sm text-(--ui-text-muted) w-28 truncate shrink-0">{{ stage.name }}</span>
            <div class="flex-1 h-2 rounded-full bg-(--ui-bg-elevated) overflow-hidden">
              <div
                class="h-full rounded-full transition-all"
                :style="{ width: `${(stage.count / maxStageCount) * 100}%`, background: stage.color }"
              />
            </div>
            <span class="text-sm font-semibold text-(--ui-text-highlighted) w-6 text-right tabular-nums shrink-0">{{ stage.count }}</span>
            <span class="text-xs text-(--ui-text-muted) w-20 text-right tabular-nums shrink-0">
              {{ stage.value > 0 ? rmK(stage.value) : '—' }}
            </span>
          </div>

          <div v-if="crm?.unassigned" class="flex items-center gap-3 opacity-50">
            <div class="w-2.5 h-2.5 rounded-full shrink-0 bg-(--ui-text-muted)" />
            <span class="text-sm text-(--ui-text-muted) w-28 shrink-0">Unassigned</span>
            <div class="flex-1 h-2 rounded-full bg-(--ui-bg-elevated) overflow-hidden">
              <div class="h-full rounded-full bg-(--ui-text-muted)"
                :style="{ width: `${(crm.unassigned / maxStageCount) * 100}%` }" />
            </div>
            <span class="text-sm font-semibold text-(--ui-text-highlighted) w-6 text-right tabular-nums shrink-0">{{ crm.unassigned }}</span>
            <span class="text-xs text-(--ui-text-muted) w-20 text-right shrink-0">—</span>
          </div>
        </div>

        <NuxtLink to="/admin/leads/pipeline"
          class="block mt-4 text-center text-xs text-(--ui-text-muted) hover:text-brand-500 transition-colors">
          Open pipeline →
        </NuxtLink>
      </UCard>

      <!-- Follow-ups -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-(--ui-text-highlighted)">Follow-ups Needed</p>
              <p class="text-xs text-(--ui-text-muted)">No activity in 7+ days</p>
            </div>
            <UBadge v-if="followUps.length" color="warning" variant="subtle" size="xs">
              {{ followUps.length }}
            </UBadge>
          </div>
        </template>

        <div v-if="followUps.length === 0" class="py-8 text-center text-sm text-(--ui-text-muted)">
          All leads have recent activity ✓
        </div>

        <div v-else class="divide-y divide-(--ui-border)">
          <NuxtLink
            v-for="lead in followUps"
            :key="lead.id"
            :to="`/admin/leads/${lead.id}`"
            class="flex items-center gap-3 py-2.5 hover:bg-(--ui-bg-elevated) -mx-4 px-4 transition-colors no-underline"
          >
            <div class="w-7 h-7 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-user-plus" class="size-3.5 text-(--ui-text-muted)" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ lead.name }}</p>
              <div class="flex items-center gap-1.5 mt-0.5">
                <span v-if="lead.stage" class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: lead.stage.color }" />
                <p class="text-xs text-(--ui-text-muted) truncate">{{ lead.stage?.name ?? 'No stage' }}</p>
              </div>
            </div>
            <div class="text-right shrink-0">
              <p class="text-xs font-semibold" :class="lead.daysIdle >= 14 ? 'text-red-500' : 'text-amber-500'">
                {{ lead.daysIdle }}d idle
              </p>
              <p v-if="lead.value" class="text-xs text-(--ui-text-muted)">{{ rmK(lead.value) }}</p>
            </div>
          </NuxtLink>
        </div>
      </UCard>

    </div>

    <!-- ── Tables row ─────────────────────────────────────── -->
    <div class="grid lg:grid-cols-2 gap-4">

      <!-- Recent orders -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-(--ui-text-highlighted)">{{ t('dash.recentOrders') }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ t('dash.latestActivity') }}</p>
            </div>
            <NuxtLink to="/admin/orders" class="text-xs text-(--ui-text-muted) hover:text-brand-500 transition-colors">
              {{ t('dash.viewAll') }}
            </NuxtLink>
          </div>
        </template>

        <div class="divide-y divide-(--ui-border)">
          <div
            v-for="o in recentOrders"
            :key="o.id"
            class="flex items-center gap-3 py-2.5 hover:bg-(--ui-bg-elevated) -mx-4 px-4 transition-colors cursor-pointer"
          >
            <div class="w-8 h-8 rounded-full bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-user" class="size-4 text-(--ui-text-muted)" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ o.customer }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ o.id }} · {{ o.items }} item{{ o.items > 1 ? 's' : '' }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-semibold text-(--ui-text-highlighted)">{{ rm(o.amount) }}</p>
              <div class="flex items-center justify-end gap-1">
                <div class="w-1.5 h-1.5 rounded-full" :class="o.dotClass" />
                <p class="text-xs text-(--ui-text-muted)">{{ o.status }}</p>
              </div>
            </div>
          </div>
        </div>
      </UCard>

      <!-- Low stock -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-(--ui-text-highlighted)">{{ t('dash.lowStockTitle') }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ t('dash.needsRestock') }}</p>
            </div>
            <NuxtLink to="/admin/products" class="text-xs text-(--ui-text-muted) hover:text-brand-500 transition-colors">
              {{ t('dash.viewAll') }}
            </NuxtLink>
          </div>
        </template>

        <div v-if="lowStockItems.length === 0" class="py-8 text-center text-(--ui-text-muted) text-sm">
          All products are well stocked 🎉
        </div>

        <div v-else class="divide-y divide-(--ui-border)">
          <div
            v-for="p in lowStockItems"
            :key="p.id"
            class="flex items-center gap-3 py-2.5 hover:bg-(--ui-bg-elevated) -mx-4 px-4 transition-colors"
          >
            <div class="w-8 h-8 rounded-lg bg-(--ui-bg-elevated) border border-(--ui-border) flex items-center justify-center shrink-0">
              <UIcon name="i-lucide-package" class="size-4 text-(--ui-text-muted)" />
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ p.name }}</p>
              <p class="text-xs text-(--ui-text-muted)">{{ p.categories?.name ?? '—' }}</p>
            </div>
            <div class="text-right shrink-0">
              <p class="text-sm font-bold" :class="liveStock(p) === 0 ? 'text-red-500' : 'text-amber-500'">
                {{ liveStock(p) }} left
              </p>
              <p class="text-xs text-(--ui-text-muted)">reorder at {{ (p.variants?.[0]?.reorder_level ?? 0) }}</p>
            </div>
          </div>
        </div>
      </UCard>

    </div>

    <!-- ── Expiry alerts (premium+) ──────────────────────── -->
    <UCard v-if="canAccess('batchTracking') && expiringLots && expiringLots.length > 0">
      <template #header>
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-(--ui-text-highlighted)">{{ t('dash.expiryTitle') }}</p>
            <p class="text-xs text-(--ui-text-muted)">{{ t('dash.expirySub') }}</p>
          </div>
          <NuxtLink to="/admin/lots" class="text-xs text-(--ui-text-muted) hover:text-brand-500 transition-colors no-underline">
            {{ t('dash.viewLots') }}
          </NuxtLink>
        </div>
      </template>

      <div class="divide-y divide-(--ui-border)">
        <div v-for="lot in expiringLots.slice(0, 6)" :key="lot.id" class="flex items-center justify-between py-3 gap-4">
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-(--ui-text-highlighted) truncate">{{ lot.products?.name }}</p>
            <p class="text-xs text-(--ui-text-muted)">
              {{ lot.variants?.name }}
              <span v-if="lot.batch_number" class="font-mono"> · {{ lot.batch_number }}</span>
            </p>
          </div>
          <div class="text-right shrink-0">
            <p class="text-xs font-semibold text-amber-500">
              {{ new Date(lot.expiry_date + 'T00:00:00').toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' }) }}
            </p>
            <p class="text-xs text-(--ui-text-muted)">{{ lot.qty_remaining }} units left</p>
          </div>
        </div>
      </div>
    </UCard>

  </div>
</template>

