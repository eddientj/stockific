<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $supabase } = useNuxtApp()

const email   = ref('')
const loading = ref(false)
const done    = ref(false)
const error   = ref('')

async function onSubmit() {
  error.value = ''
  if (!email.value.trim()) { error.value = 'Email is required'; return }
  loading.value = true
  const { error: err } = await $supabase.auth.resetPasswordForEmail(email.value.trim(), {
    redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
  })
  loading.value = false
  if (err) { error.value = err.message; return }
  done.value = true
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="font-semibold text-(--ui-text-highlighted)">Reset your password</p>
      <p class="text-sm text-(--ui-text-muted) mt-0.5">We'll send a reset link to your email.</p>
    </template>

    <div v-if="!done" class="space-y-4">
      <UFormField label="Email" required>
        <UInput v-model="email" type="email" placeholder="you@company.com" class="w-full" @keyup.enter="onSubmit" />
      </UFormField>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <UButton class="w-full justify-center" :loading="loading" @click="onSubmit">
        Send reset link
      </UButton>
    </div>

    <div v-else class="py-4 text-center space-y-2">
      <UIcon name="i-lucide-mail-check" class="size-10 text-brand-500 mx-auto" />
      <p class="font-medium text-(--ui-text-highlighted)">Check your email</p>
      <p class="text-sm text-(--ui-text-muted)">
        We sent a reset link to <strong>{{ email }}</strong>. Click it to choose a new password.
      </p>
    </div>

    <template #footer>
      <p class="text-sm text-center text-(--ui-text-muted)">
        Remember it?
        <NuxtLink to="/login" class="text-(--ui-primary) hover:underline">Sign in</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
