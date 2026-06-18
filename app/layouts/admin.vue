<script setup lang="ts">
const { locale, t, setLocale } = useLocale()
const { signOut, displayName } = useAuth()

// ── Sidebar state (persisted) ─────────────────────────────────
const sidebarCollapsed = ref(false)
onMounted(() => {
  const stored = localStorage.getItem('sidebar-collapsed')
  if (stored !== null) sidebarCollapsed.value = stored === 'true'
})
watch(sidebarCollapsed, v => localStorage.setItem('sidebar-collapsed', String(v)))

// ── Nav groups ────────────────────────────────────────────────
const navGroups = computed(() => [
  {
    items: [
      { to: '/admin', label: t('nav.dashboard'), icon: 'i-lucide-layout-dashboard', exact: true },
    ],
  },
  {
    label: t('nav.group.sales'),
    items: [
      { to: '/admin/orders',   label: t('nav.orders'),   icon: 'i-lucide-shopping-cart' },
      { to: '/admin/invoices', label: t('nav.invoices'), icon: 'i-lucide-file-text'     },
    ],
  },
  {
    label: t('nav.group.inventory'),
    items: [
      { to: '/admin/products',        label: t('nav.products'),       icon: 'i-lucide-package'       },
      { to: '/admin/categories',      label: t('nav.categories'),     icon: 'i-lucide-tag'           },
      { to: '/admin/suppliers',       label: t('nav.suppliers'),      icon: 'i-lucide-truck'         },
      { to: '/admin/purchase-orders', label: t('nav.purchaseOrders'), icon: 'i-lucide-clipboard-list' },
    ],
  },
  {
    label: t('nav.group.crm'),
    items: [
      { to: '/admin/leads',          label: t('nav.leads'),     icon: 'i-lucide-user-plus'  },
      { to: '/admin/leads/pipeline', label: t('nav.pipeline'),  icon: 'i-lucide-kanban'     },
      { to: '/admin/companies',      label: t('nav.companies'), icon: 'i-lucide-building-2' },
    ],
  },
  {
    label: t('nav.group.contacts'),
    items: [
      { to: '/admin/customers', label: t('nav.customers'), icon: 'i-lucide-users' },
    ],
  },
  {
    label: t('nav.group.analytics'),
    items: [
      { to: '/admin/reports', label: t('nav.reports'), icon: 'i-lucide-bar-chart-2' },
    ],
  },
])

// ── Topbar menus ──────────────────────────────────────────────
const settingsMenu = computed(() => [
  [{ label: t('settings.business'), icon: 'i-lucide-building-2', to: '/admin/settings' }],
  [{ label: 'Sign out', icon: 'i-lucide-log-out', onSelect: signOut }],
])

const langMenu = computed(() => [[
  {
    label: t('lang.en'),
    icon:  locale.value === 'en' ? 'i-lucide-check' : 'i-lucide-languages',
    onSelect() { setLocale('en') },
  },
  {
    label: t('lang.ms'),
    icon:  locale.value === 'ms' ? 'i-lucide-check' : 'i-lucide-languages',
    onSelect() { setLocale('ms') },
  },
]])

const colorMode = useColorMode()
const isDark = computed(() => colorMode.preference === 'dark')
function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <div class="flex min-h-screen bg-(--ui-bg-muted)">

    <!-- ── Sidebar ─────────────────────────────────────────── -->
    <AppSidebar v-model:collapsed="sidebarCollapsed" :groups="navGroups" />

    <!-- ── Right panel ────────────────────────────────────── -->
    <div class="flex-1 flex flex-col min-w-0">

      <!-- Topbar — clean, right-aligned controls only -->
      <header class="topbar h-14 border-b border-(--ui-border) flex items-center justify-end px-5 gap-1 shrink-0">

        <NuxtLink
          v-if="displayName"
          to="/admin/profile"
          class="text-sm font-medium px-2 py-1.5 rounded-md text-(--ui-text-muted) hover:text-(--ui-text-highlighted) hover:bg-(--ui-bg-elevated) transition-colors whitespace-nowrap no-underline"
        >{{ displayName }}</NuxtLink>

        <UDropdownMenu :items="langMenu">
          <UButton variant="ghost" color="neutral" size="sm" class="font-semibold text-xs px-2 min-w-0">
            {{ locale === 'ms' ? 'MY' : 'EN' }}
          </UButton>
        </UDropdownMenu>

        <UDropdownMenu :items="settingsMenu">
          <UButton icon="i-lucide-settings" variant="ghost" color="neutral" size="sm" />
        </UDropdownMenu>

        <button
          class="theme-toggle"
          :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
          @click="toggleTheme"
        >
          <span class="toggle-track" :class="{ active: isDark }">
            <span class="toggle-thumb" :class="{ active: isDark }">
              <UIcon :name="isDark ? 'i-lucide-moon' : 'i-lucide-sun'" class="size-3 icon" />
            </span>
          </span>
        </button>

      </header>

      <!-- Page content -->
      <main class="flex-1 overflow-auto">
        <div class="max-w-7xl mx-auto px-6 py-8">
          <slot />
        </div>
      </main>

    </div>
  </div>
</template>

<style scoped>
.topbar {
  background: var(--ui-bg);
}
.dark .topbar {
  background: #1E293B;
}

.theme-toggle {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
}
.toggle-track {
  display: flex;
  align-items: center;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: var(--ui-bg-elevated);
  border: 1px solid var(--ui-border);
  padding: 2px;
  transition: background 0.2s;
  position: relative;
}
.toggle-track.active {
  background: var(--color-brand-500);
  border-color: var(--color-brand-500);
}
.toggle-thumb {
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: #FFFFFF;
  display: grid;
  place-items: center;
  transition: transform 0.2s;
  transform: translateX(0);
}
.toggle-thumb.active {
  transform: translateX(20px);
}
.icon { color: var(--color-brand-500); }
.toggle-track.active .icon { color: var(--color-brand-200); }
</style>
