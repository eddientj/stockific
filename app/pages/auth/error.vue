<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const message = computed(() => (route.query.message as string) || 'Authentication failed.')
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-(--ui-bg-muted) px-4">
    <div class="w-full max-w-sm text-center space-y-4">
      <UIcon name="i-lucide-x-circle" class="size-12 text-red-500 mx-auto" />
      <p class="font-semibold text-(--ui-text-highlighted)">Link invalid or expired</p>
      <p class="text-sm text-(--ui-text-muted)">{{ message }}</p>
      <div class="flex gap-3 justify-center">
        <UButton variant="outline" color="neutral" to="/login">Sign in</UButton>
        <UButton to="/forgot-password">Request new link</UButton>
      </div>
    </div>
  </div>
</template>
