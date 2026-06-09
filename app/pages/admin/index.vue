<script setup lang="ts">
import type { ProductRow } from '~/types'

definePageMeta({ layout: 'admin' })

// ── Live data ─────────────────────────────────────────────
const { data: products } = await useFetch<ProductRow[]>('/api/products')

const liveStock = (p: ProductRow) =>
  (p.variants ?? []).reduce((s, v) => s + v.stock_quantity - v.stock_on_hold, 0)

const totalProducts = computed(() => products.value?.length ?? 0)

const lowStockItems = computed(() =>
  (products.value ?? [])
    .filter(p => { const s = liveStock(p); return s > 0 && s <= 5 })
    .sort((a, b) => liveStock(a) - liveStock(b))
    .slice(0, 6)
)

const outOfStockCount = computed(() =>
  (products.value ?? []).filter(p => liveStock(p) === 0).length
)

const totalStockValue = computed(() =>
  (products.value ?? []).reduce((sum, p) => sum + Number(p.price) * liveStock(p), 0)
)

// ── Revenue sparkline (deterministic 30-day mock) ─────────
// Uses sin-based seeding so SSR and client produce identical values
const SVG_W = 560
const SVG_H = 72

const revenue30d = Array.from({ length: 30 }, (_, i) => {
  const r1 = (Math.sin(i * 2.3 + 1.1) + 1) / 2
  const r2 = (Math.sin(i * 5.7 + 2.4) + 1) / 2
  const dayOfWeek = (3 + i) % 7 // start on a Wednesday
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
  const base = isWeekend ? 2800 : 1700
  return Math.round(base + r1 * 900 + r2 * 500 - 100)
})

const totalRevenue = revenue30d.reduce((s, v) => s + v, 0)
const prevRevenue  = Math.round(totalRevenue * 0.87) // fake last-month comparison
const revenueChange = +(((totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1)

const maxR = Math.max(...revenue30d)
const minR = Math.min(...revenue30d) - 100

function ry(v: number) {
  return SVG_H - ((v - minR) / (maxR - minR)) * SVG_H * 0.88
}

const chartPts = revenue30d.map((v, i) => ({
  x: (i / (revenue30d.length - 1)) * SVG_W,
  y: ry(v),
}))
const polyline = chartPts.map(p => `${p.x},${p.y}`).join(' ')
const fillPath = (() => {
  const first = chartPts[0]!
  const last  = chartPts[chartPts.length - 1]!
  return `M${first.x},${SVG_H} ${chartPts.map(p => `L${p.x},${p.y}`).join(' ')} L${last.x},${SVG_H} Z`
})()

// ── Order mock data ───────────────────────────────────────
const totalOrders = 128
const ordersChange = 8.3

const orderStatus = [
  { label: 'Delivered', count: 48, color: '#008080',  bg: 'bg-teal-500'   },
  { label: 'Shipped',   count: 39, color: '#0EA5E9',  bg: 'bg-sky-500'    },
  { label: 'Confirmed', count: 25, color: '#8B5CF6',  bg: 'bg-violet-500' },
  { label: 'Pending',   count: 16, color: '#F59E0B',  bg: 'bg-amber-500'  },
]

const recentOrders = [
  { id: 'ORD-1042', customer: 'Ahmad Razif',   items: 2, amount: 459.00, status: 'Shipped',   dotClass: 'bg-sky-400'    },
  { id: 'ORD-1041', customer: 'Sarah Tan',     items: 1, amount: 89.90,  status: 'Delivered', dotClass: 'bg-teal-400'   },
  { id: 'ORD-1040', customer: 'Wei Kang Lim',  items: 3, amount: 729.80, status: 'Confirmed', dotClass: 'bg-violet-400' },
  { id: 'ORD-1039', customer: 'Priya Nair',    items: 1, amount: 149.90, status: 'Pending',   dotClass: 'bg-amber-400'  },
  { id: 'ORD-1038', customer: 'Haziq Amir',    items: 2, amount: 299.00, status: 'Delivered', dotClass: 'bg-teal-400'   },
  { id: 'ORD-1037', customer: 'Melissa Chong', items: 4, amount: 1148.60,status: 'Shipped',   dotClass: 'bg-sky-400'    },
]

// ── Helpers ───────────────────────────────────────────────
const rm = (n: number) => `RM ${n.toLocaleString('en-MY', { minimumFractionDigits: 2 })}`
const rmK = (n: number) => n >= 1000 ? `RM ${(n / 1000).toFixed(1)}k` : rm(n)
</script>

<template>
  <div class="space-y-6">

    <!-- ── Page header ──────────────────────────────────── -->
    <div class="flex items-start justify-between">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-(--ui-text-highlighted)">Dashboard</h1>
        <p class="mt-1 text-sm text-(--ui-text-muted)">Your store at a glance.</p>
      </div>
      <span class="text-xs text-(--ui-text-muted) mt-1.5">Last 30 days</span>
    </div>

    <!-- ── Stat cards ────────────────────────────────────── -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">

      <!-- Revenue -->
      <UCard class="stat-card">
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-circle-dollar-sign" class="size-4 text-teal-500" />
          </div>
          <span class="text-xs font-medium text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-lucide-trending-up" class="size-3" />
            +{{ revenueChange }}%
          </span>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">
          {{ rmK(totalRevenue) }}
        </p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">Total revenue</p>
      </UCard>

      <!-- Orders -->
      <UCard class="stat-card">
        <div class="flex items-start justify-between mb-3">
          <div class="w-9 h-9 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <UIcon name="i-lucide-shopping-cart" class="size-4 text-violet-500" />
          </div>
          <span class="text-xs font-medium text-emerald-500 flex items-center gap-0.5">
            <UIcon name="i-lucide-trending-up" class="size-3" />
            +{{ ordersChange }}%
          </span>
        </div>
        <p class="text-2xl font-bold text-(--ui-text-highlighted) tracking-tight">{{ totalOrders }}</p>
        <p class="text-xs text-(--ui-text-muted) mt-0.5">Total orders</p>
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
        <p class="text-xs text-(--ui-text-muted) mt-0.5">Active products</p>
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
        <p class="text-xs text-(--ui-text-muted) mt-0.5">Low stock items</p>
      </UCard>

    </div>

    <!-- ── Charts row ─────────────────────────────────────── -->
    <div class="grid lg:grid-cols-3 gap-4">

      <!-- Revenue sparkline -->
      <UCard class="lg:col-span-2">
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-(--ui-text-highlighted)">Revenue</p>
              <p class="text-xs text-(--ui-text-muted)">Daily revenue — last 30 days</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-teal-500">{{ rm(totalRevenue) }}</p>
              <p class="text-xs text-emerald-500">↑ vs last month</p>
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
                <stop offset="0%"   stop-color="#008080" stop-opacity="0.25" />
                <stop offset="100%" stop-color="#008080" stop-opacity="0"    />
              </linearGradient>
            </defs>
            <!-- Horizontal grid lines -->
            <line v-for="n in 3" :key="n" :x1="0" :x2="SVG_W" :y1="(SVG_H / 3) * n" :y2="(SVG_H / 3) * n"
              stroke="currentColor" class="text-(--ui-border)" stroke-width="0.5" />
            <!-- Fill -->
            <path :d="fillPath" fill="url(#revGrad)" />
            <!-- Line -->
            <polyline :points="polyline" fill="none" stroke="#008080" stroke-width="2"
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
            <p class="font-semibold text-(--ui-text-highlighted)">Orders</p>
            <p class="text-xs text-(--ui-text-muted)">Breakdown by status</p>
          </div>
        </template>

        <!-- Total -->
        <div class="text-center mb-5">
          <p class="text-4xl font-bold text-(--ui-text-highlighted)">{{ totalOrders }}</p>
          <p class="text-xs text-(--ui-text-muted) mt-1">this month</p>
        </div>

        <!-- Stacked bar -->
        <div class="h-2 rounded-full overflow-hidden flex mb-4">
          <div
            v-for="s in orderStatus"
            :key="s.label"
            :class="s.bg"
            :style="{ width: `${(s.count / totalOrders) * 100}%` }"
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
                  :style="{ width: `${(s.count / totalOrders) * 100}%` }"
                  class="h-full rounded-full"
                />
              </div>
              <span class="text-sm font-medium text-(--ui-text-highlighted) w-5 text-right">{{ s.count }}</span>
            </div>
          </div>
        </div>

        <NuxtLink
          to="/admin/orders"
          class="block mt-5 text-center text-xs text-(--ui-text-muted) hover:text-teal-500 transition-colors"
        >
          View all orders →
        </NuxtLink>
      </UCard>
    </div>

    <!-- ── Tables row ─────────────────────────────────────── -->
    <div class="grid lg:grid-cols-2 gap-4">

      <!-- Recent orders -->
      <UCard>
        <template #header>
          <div class="flex items-center justify-between">
            <div>
              <p class="font-semibold text-(--ui-text-highlighted)">Recent orders</p>
              <p class="text-xs text-(--ui-text-muted)">Latest activity</p>
            </div>
            <NuxtLink to="/admin/orders" class="text-xs text-(--ui-text-muted) hover:text-teal-500 transition-colors">
              View all →
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
              <p class="font-semibold text-(--ui-text-highlighted)">Low stock</p>
              <p class="text-xs text-(--ui-text-muted)">Needs restocking soon</p>
            </div>
            <NuxtLink to="/admin/products" class="text-xs text-(--ui-text-muted) hover:text-teal-500 transition-colors">
              View all →
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
              <p class="text-sm font-bold" :class="liveStock(p) <= 2 ? 'text-red-500' : 'text-amber-500'">
                {{ liveStock(p) }} left
              </p>
              <p class="text-xs text-(--ui-text-muted)">{{ rm(Number(p.price)) }}</p>
            </div>
          </div>
        </div>
      </UCard>

    </div>

  </div>
</template>

