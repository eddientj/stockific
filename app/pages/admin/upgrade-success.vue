<script setup lang="ts">
definePageMeta({ layout: 'admin' })
</script>

<template>
  <div class="flex items-center justify-center min-h-[60vh]">
    <div class="text-center space-y-4 max-w-md">
      <div class="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto">
        <UIcon name="i-lucide-check" class="size-8 text-emerald-500" />
      </div>
      <h1 class="text-2xl font-bold text-(--ui-text-highlighted)">Payment received!</h1>
      <p class="text-(--ui-text-muted)">
        Your plan upgrade is being activated — this usually takes less than a minute.
        Refresh the page once you're back on the dashboard to see your new limits.
      </p>
      <div class="pt-2">
        <UButton to="/admin">Back to dashboard</UButton>
      </div>
    </div>
  </div>
</template>
