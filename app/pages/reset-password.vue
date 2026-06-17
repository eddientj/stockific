<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { updatePassword } = useAuth()

const form = reactive({ password: '', confirm: '' })
const confirmError = ref('')
const formError    = ref('')
const loading      = ref(false)
const done         = ref(false)

watch(() => form.confirm, (val) => {
  confirmError.value = val && form.password !== val ? 'Passwords do not match' : ''
})

watch(() => form.password, () => {
  if (form.confirm) confirmError.value = form.password !== form.confirm ? 'Passwords do not match' : ''
})

async function onSubmit() {
  formError.value = ''
  if (form.password.length < 8) { formError.value = 'Password must be at least 8 characters'; return }
  if (form.password !== form.confirm) { confirmError.value = 'Passwords do not match'; return }
  loading.value = true
  try {
    await updatePassword(form.password)
    done.value = true
  } catch (e: any) {
    formError.value = e.message ?? 'Failed to update password'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="font-semibold text-(--ui-text-highlighted)">Choose a new password</p>
    </template>

    <div v-if="!done" class="space-y-4">
      <UFormField label="New password" required>
        <UInput v-model="form.password" type="password" placeholder="Min. 8 characters" class="w-full" />
      </UFormField>

      <UFormField label="Confirm password" required :error="confirmError">
        <UInput v-model="form.confirm" type="password" placeholder="Repeat password" class="w-full" @keyup.enter="onSubmit" />
      </UFormField>

      <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>

      <UButton class="w-full justify-center" :loading="loading" @click="onSubmit">
        Update password
      </UButton>
    </div>

    <div v-else class="py-4 text-center space-y-2">
      <UIcon name="i-lucide-check-circle" class="size-10 text-indigo-500 mx-auto" />
      <p class="font-medium text-(--ui-text-highlighted)">Password updated</p>
      <p class="text-sm text-(--ui-text-muted)">Your password has been changed successfully.</p>
      <UButton class="mt-2" variant="outline" color="neutral" to="/admin">Go to dashboard</UButton>
    </div>
  </UCard>
</template>
