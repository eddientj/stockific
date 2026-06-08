<script setup lang="ts">
const nav = [
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/orders',   label: 'Orders'   },
  { to: '/admin/reports',  label: 'Reports'  },
]

const colorMode = useColorMode()
const isDark = computed(() => colorMode.value === 'dark')
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
            class="px-3 py-1.5 rounded-md text-sm transition-colors no-underline nav-link"
          >
            {{ item.label }}
          </NuxtLink>
        </nav>

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
