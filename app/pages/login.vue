<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { signIn, signInWithGoogle, loading } = useAuth()
const toast = useAppToast()

const form  = reactive({ identifier: '', password: '' })
const error = ref('')

async function onSubmit() {
  error.value = ''
  try {
    await signIn(form.identifier, form.password)
    await navigateTo('/admin')
  } catch (e: any) {
    error.value = e.message ?? 'Login failed'
  }
}

async function onGoogle() {
  try {
    await signInWithGoogle()
  } catch (e: any) {
    toast.error(e.message ?? 'Google sign-in failed')
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="font-semibold text-(--ui-text-highlighted)">Sign in to your account</p>
    </template>

    <div class="space-y-4">
      <UFormField label="Email or username">
        <UInput v-model="form.identifier" placeholder="you@example.com or eddien" class="w-full" />
      </UFormField>

      <UFormField label="Password">
        <UInput v-model="form.password" type="password" placeholder="••••••••" class="w-full" @keyup.enter="onSubmit" />
        <template #help>
          <NuxtLink to="/forgot-password" class="text-(--ui-primary) hover:underline text-xs">Forgot password?</NuxtLink>
        </template>
      </UFormField>

      <p v-if="error" class="text-sm text-red-500">{{ error }}</p>

      <UButton class="w-full justify-center" :loading="loading" @click="onSubmit">
        Sign in
      </UButton>

      <div class="relative flex items-center gap-3">
        <div class="flex-1 h-px bg-(--ui-border)" />
        <span class="text-xs text-(--ui-text-muted)">or</span>
        <div class="flex-1 h-px bg-(--ui-border)" />
      </div>

      <UButton variant="outline" color="neutral" class="w-full justify-center" icon="i-simple-icons-google" @click="onGoogle">
        Continue with Google
      </UButton>
    </div>

    <template #footer>
      <p class="text-sm text-center text-(--ui-text-muted)">
        No account?
        <NuxtLink to="/signup" class="text-(--ui-primary) hover:underline">Sign up</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
