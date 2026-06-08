<template>
  <div class="min-h-screen bg-(--ui-bg-muted)">
    <header style="background:#0D1F1F">
      <div class="max-w-7xl mx-auto px-6 h-14 flex items-center gap-2.5">
        <span class="w-[3px] h-5 rounded-full block" style="background:#008080" />
        <span class="text-sm font-semibold tracking-tight text-white">Stockific</span>
      </div>
    </header>
    <main class="max-w-2xl mx-auto px-6 py-20">
      <h1 class="text-3xl font-semibold tracking-tight mb-3 text-(--ui-text-highlighted)">
        Inventory management for Malaysian SMEs
      </h1>
      <p class="text-base mb-10 text-(--ui-text-muted)">
        Track stock, take orders, accept HitPay payments — built for local businesses.
      </p>
      <div class="flex gap-3 flex-wrap">
        <UButton to="/admin/products" size="lg" icon="i-lucide-layout-dashboard">
          Open admin panel
        </UButton>
        <UButton to="/store" variant="outline" size="lg" icon="i-lucide-shopping-bag" color="neutral" disabled>
          Customer store (soon)
        </UButton>
      </div>
    </main>
  </div>
</template>
