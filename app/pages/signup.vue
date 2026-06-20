<script setup lang="ts">
definePageMeta({ layout: 'auth' })

const { $supabase } = useNuxtApp()
const { signUp, loading } = useAuth()

const form = reactive({
  firstName: '',
  lastName:  '',
  username:  '',
  email:     '',
  password:  '',
  confirm:   '',
})

const confirmError = ref('')
const formError    = ref('')
const done         = ref(false)

watch(() => form.confirm, (val) => {
  confirmError.value = val && form.password !== val ? 'Passwords do not match' : ''
})

watch(() => form.password, () => {
  if (form.confirm) {
    confirmError.value = form.password !== form.confirm ? 'Passwords do not match' : ''
  }
})

function isValidUsername(v: string) {
  return /^[a-z0-9_-]{3,30}$/.test(v)
}

async function onSubmit() {
  formError.value = ''

  if (!form.firstName.trim())        { formError.value = 'First name is required'; return }
  if (!form.username.trim())         { formError.value = 'Username is required'; return }
  if (!isValidUsername(form.username)) { formError.value = 'Username must be 3–30 chars: letters, numbers, _ or -'; return }
  if (!form.email.trim())            { formError.value = 'Email is required'; return }
  if (form.password.length < 8)      { formError.value = 'Password must be at least 8 characters'; return }
  if (form.password !== form.confirm) { formError.value = 'Passwords do not match'; return }

  try {
    const data = await signUp(form.email, form.password, {
      username:   form.username.toLowerCase(),
      first_name: form.firstName.trim(),
      last_name:  form.lastName.trim() || undefined,
    })

    if (data.session) {
      // Email confirmation is off — session available immediately, create profile now.
      await $supabase.from('profiles').insert({
        id:         data.user!.id,
        username:   form.username.toLowerCase(),
        first_name: form.firstName.trim(),
        last_name:  form.lastName.trim() || null,
      })
      await navigateTo('/onboarding')
    } else {
      // Email confirmation is on — user must click the link first.
      done.value = true
    }
  } catch (e: any) {
    formError.value = e.message ?? 'Signup failed'
  }
}
</script>

<template>
  <UCard>
    <template #header>
      <p class="font-semibold text-(--ui-text-highlighted)">Create your account</p>
      <p class="text-sm text-(--ui-text-muted) mt-0.5">14-day free trial. No credit card required.</p>
    </template>

    <div v-if="!done" class="space-y-4">
      <div class="grid grid-cols-2 gap-3">
        <UFormField label="First name" required>
          <UInput v-model="form.firstName" placeholder="Eddie" class="w-full" />
        </UFormField>
        <UFormField label="Last name">
          <UInput v-model="form.lastName" placeholder="Ng" class="w-full" />
        </UFormField>
      </div>

      <UFormField label="Username" required hint="3–30 chars, letters/numbers/_ only">
        <UInput v-model="form.username" placeholder="eddien" class="w-full" @input="form.username = (form.username as string).toLowerCase()" />
      </UFormField>

      <UFormField label="Email" required>
        <UInput v-model="form.email" type="email" placeholder="you@company.com" class="w-full" />
      </UFormField>

      <UFormField label="Password" required>
        <UInput v-model="form.password" type="password" placeholder="Min. 8 characters" class="w-full" />
      </UFormField>

      <UFormField label="Confirm password" required :error="confirmError">
        <UInput v-model="form.confirm" type="password" placeholder="Repeat password" class="w-full" @keyup.enter="onSubmit" />
      </UFormField>

      <p v-if="formError" class="text-sm text-red-500">{{ formError }}</p>

      <UButton class="w-full justify-center" :loading="loading" @click="onSubmit">
        Create account
      </UButton>
    </div>

    <div v-else class="py-4 text-center space-y-2">
      <UIcon name="i-lucide-mail-check" class="size-10 text-brand-500 mx-auto" />
      <p class="font-medium text-(--ui-text-highlighted)">Check your email</p>
      <p class="text-sm text-(--ui-text-muted)">
        We sent a confirmation link to <strong>{{ form.email }}</strong>. Click it to activate your account.
      </p>
    </div>

    <template #footer>
      <p class="text-sm text-center text-(--ui-text-muted)">
        Already have an account?
        <NuxtLink to="/login" class="text-(--ui-primary) hover:underline">Sign in</NuxtLink>
      </p>
    </template>
  </UCard>
</template>
