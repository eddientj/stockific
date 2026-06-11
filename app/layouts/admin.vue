<script setup lang="ts">
const { locale, t, setLocale } = useLocale()

const nav = computed(() => [
  { to: '/admin',            label: t('nav.dashboard'),  exact: true  },
  { to: '/admin/products',   label: t('nav.products'),   exact: false },
  { to: '/admin/orders',     label: t('nav.orders'),     exact: false },
  { to: '/admin/customers',  label: t('nav.customers'),  exact: false },
  { to: '/admin/invoices',   label: t('nav.invoices'),   exact: false },
  { to: '/admin/reports',    label: t('nav.reports'),    exact: false },
  { to: '/admin/categories', label: t('nav.categories'), exact: false },
])

const settingsMenu = computed(() => [
  [{ label: t('settings.business'), icon: 'i-lucide-building-2', to: '/admin/settings' }],
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
// Use preference (the stored value) so the toggle reflects correctly after reload
const isDark = computed(() => colorMode.preference === 'dark')
function toggleTheme() {
  colorMode.preference = isDark.value ? 'light' : 'dark'
}
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg-muted)">

    <!-- ── Top header bar ─────────────────────────────── -->
    <header class="app-header border-b border-(--ui-border)">
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center gap-6">

        <!-- Wordmark -->
        <NuxtLink to="/" class="flex items-center gap-2.5 shrink-0 no-underline">
          <span class="w-[3px] h-5 rounded-full block" style="background:#008080" />
          <span class="text-sm font-semibold tracking-tight text-(--ui-text-highlighted)">Stockific</span>
        </NuxtLink>

        <!-- Nav links -->
        <nav class="flex items-center gap-1 flex-1">
          <NuxtLink
            v-for="item in nav"
            :key="item.to"
            :to="item.to"
            :exact-active-class="item.exact ? 'router-link-active' : undefined"
            :active-class="item.exact ? 'no-match' : undefined"
            class="px-3 py-1.5 rounded-md text-sm transition-colors no-underline nav-link"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

        <!-- Language switcher -->
        <UDropdownMenu :items="langMenu">
          <UButton
            variant="ghost"
            color="neutral"
            size="sm"
            class="font-semibold text-xs px-2 min-w-0"
          >{{ locale === 'ms' ? 'MY' : 'EN' }}</UButton>
        </UDropdownMenu>

        <!-- Settings dropdown -->
        <UDropdownMenu :items="settingsMenu">
          <UButton icon="i-lucide-settings" variant="ghost" color="neutral" size="sm" />
        </UDropdownMenu>

        <!-- Theme toggle -->
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

      </div>
    </header>

    <!-- ── Page content ───────────────────────────────── -->
    <main class="max-w-7xl mx-auto px-6 py-8">
      <slot />
    </main>

  </div>
</template>

<style scoped>
/* Header surface — white in light, dark navy in dark */
.app-header {
  background: var(--ui-bg);
}
.dark .app-header {
  background: #0D1F1F;
}

/* Nav links */
.nav-link        { color: var(--ui-text-muted); }
.nav-link:hover  { color: var(--ui-text-highlighted); background: var(--ui-bg-elevated); }
.nav-link.router-link-active {
  color: #FFFFFF;
  background: #008080;
}

/* Toggle */
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
  background: #008080;
  border-color: #008080;
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
.icon { color: #008080; }
.toggle-track.active .icon { color: #9BB8B8; }
</style>
