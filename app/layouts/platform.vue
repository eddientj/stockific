<script setup lang="ts">
const { signOut } = useAuth()
</script>

<template>
  <div class="min-h-screen bg-(--ui-bg-muted)">
    <header class="h-14 bg-(--ui-bg) border-b border-(--ui-border) flex items-center justify-between px-6 shrink-0">
      <div class="flex items-center gap-3">
        <img src="/logo-icon.png" alt="" class="h-6 w-6 object-contain" />
        <span class="text-sm font-bold text-(--ui-text-highlighted)">Stockific</span>
        <span class="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 tracking-wide">
          Platform Admin
        </span>
      </div>
      <div class="flex items-center gap-4">
        <NuxtLink
          to="/admin"
          class="text-xs text-(--ui-text-muted) hover:text-(--ui-text-highlighted) transition-colors no-underline"
        >
          ← Back to app
        </NuxtLink>
        <UButton size="xs" variant="ghost" color="neutral" @click="signOut">Sign out</UButton>
      </div>
    </header>
    <main class="max-w-6xl mx-auto px-6 py-8">
      <slot />
    </main>
  </div>
</template>
