<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $supabase } = useNuxtApp()

const name = ref('')
const loading = ref(false)
const error = ref('')

async function onSubmit() {
  if (!name.value.trim()) {
    error.value = 'Please enter your business name'
    return
  }
  error.value = ''
  loading.value = true

  try {
    await $fetch('/api/auth/onboard', { method: 'POST', body: { name: name.value.trim() } })
    await $supabase.auth.refreshSession()
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e.data?.message ?? e.message ?? 'Failed to create organisation'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="font-semibold text-(--ui-text-highlighted)">Set up your business</p>
      <p class="text-sm text-(--ui-text-muted) mt-0.5">This takes 10 seconds.</p>
    </template>

    <div class="space-y-4">
      <UFormField label="Business name" help="You can change this later in Settings.">
        <UInput
          v-model="name"
          placeholder="e.g. Kedai Runcit Sdn Bhd"
          class="w-full"
          @keyup.enter="onSubmit"
        />
      </UFormField>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <UButton class="w-full justify-center" :loading="loading" @click="onSubmit">
        Create my workspace
      </UButton>
    </div>
  </UCard>
</template>
