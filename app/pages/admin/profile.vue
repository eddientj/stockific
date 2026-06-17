<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const { user, updateProfile, updatePassword } = useAuth()
const toast = useAppToast()

const profile = reactive({ firstName: '', lastName: '' })
watchEffect(() => {
  const meta = user.value?.user_metadata
  if (meta) {
    profile.firstName = meta.first_name ?? ''
    profile.lastName  = meta.last_name  ?? ''
  }
})
const username = computed(() => user.value?.user_metadata?.username ?? '')
const email    = computed(() => user.value?.email ?? '')

const profileLoading = ref(false)

async function saveProfile() {
  profileLoading.value = true
  try {
    await updateProfile({ first_name: profile.firstName.trim(), last_name: profile.lastName.trim() || undefined })
    toast.success('Profile updated')
  } catch (e: any) {
    toast.error(e.message ?? 'Failed to update profile')
  } finally {
    profileLoading.value = false
  }
}

const pwd = reactive({ current: '', next: '', confirm: '' })
const pwdConfirmError = ref('')
const pwdLoading      = ref(false)

watch(() => pwd.confirm, (val) => {
  pwdConfirmError.value = val && pwd.next !== val ? 'Passwords do not match' : ''
})

async function savePassword() {
  if (pwd.next.length < 8)       { toast.error('Password must be at least 8 characters'); return }
  if (pwd.next !== pwd.confirm)  { toast.error('Passwords do not match'); return }
  pwdLoading.value = true
  try {
    await updatePassword(pwd.next)
    pwd.current = ''; pwd.next = ''; pwd.confirm = ''
    toast.success('Password updated')
  } catch (e: any) {
    toast.error(e.message ?? 'Failed to update password')
  } finally {
    pwdLoading.value = false
  }
}
</script>

<template>
  <div class="space-y-6 max-w-2xl mx-auto">
    <h1 class="text-xl font-semibold text-(--ui-text-highlighted)">My Profile</h1>

    <!-- Personal info -->
    <UCard>
      <template #header>
        <p class="font-medium text-(--ui-text-highlighted)">Personal information</p>
      </template>

      <div class="space-y-4">
        <div class="grid grid-cols-2 gap-4">
          <UFormField label="First name" required>
            <UInput v-model="profile.firstName" class="w-full" />
          </UFormField>
          <UFormField label="Last name">
            <UInput v-model="profile.lastName" class="w-full" />
          </UFormField>
        </div>

        <UFormField label="Username">
          <UInput :model-value="username" disabled class="w-full" />
        </UFormField>

        <UFormField label="Email">
          <UInput :model-value="email" disabled class="w-full" />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton :loading="profileLoading" @click="saveProfile">Save changes</UButton>
        </div>
      </template>
    </UCard>

    <!-- Change password -->
    <UCard>
      <template #header>
        <p class="font-medium text-(--ui-text-highlighted)">Change password</p>
      </template>

      <div class="space-y-4">
        <UFormField label="New password" required>
          <UInput v-model="pwd.next" type="password" placeholder="Min. 8 characters" class="w-full" />
        </UFormField>

        <UFormField label="Confirm new password" required :error="pwdConfirmError">
          <UInput v-model="pwd.confirm" type="password" placeholder="Repeat password" class="w-full" />
        </UFormField>
      </div>

      <template #footer>
        <div class="flex justify-end">
          <UButton :loading="pwdLoading" @click="savePassword">Update password</UButton>
        </div>
      </template>
    </UCard>
  </div>
</template>
