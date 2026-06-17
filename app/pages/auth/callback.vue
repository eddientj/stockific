<script setup lang="ts">
definePageMeta({ layout: false })

const { $supabase } = useNuxtApp()
const route = useRoute()
const errorMsg = ref('')

onMounted(async () => {
  const code = route.query.code as string | undefined
  const type = route.query.type as string | undefined

  if (code) {
    const { error } = await $supabase.auth.exchangeCodeForSession(code)
    if (error) {
      errorMsg.value = error.message
      return
    }
  }

  const { data: { session } } = await $supabase.auth.getSession()

  if (!session) {
    errorMsg.value = 'No session could be established. The link may be expired or already used.'
    return
  }

  if (type === 'recovery') {
    await navigateTo('/reset-password')
    return
  }

  // Email confirmation: create profile from metadata
  const meta = session.user.user_metadata
  if (meta?.username) {
    await $supabase.from('profiles').upsert({
      id:         session.user.id,
      username:   meta.username,
      first_name: meta.first_name,
      last_name:  meta.last_name ?? null,
    }, { onConflict: 'id', ignoreDuplicates: true })
  }

  await navigateTo(decodeJwt(session.access_token).org_id ? '/admin' : '/onboarding')
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-(--ui-bg-muted) px-4">
    <div v-if="errorMsg" class="w-full max-w-sm text-center space-y-4">
      <UIcon name="i-lucide-x-circle" class="size-12 text-red-500 mx-auto" />
      <p class="font-semibold text-(--ui-text-highlighted)">Link invalid or expired</p>
      <p class="text-sm text-(--ui-text-muted)">{{ errorMsg }}</p>
      <div class="flex gap-3 justify-center">
        <UButton variant="outline" color="neutral" to="/login">Sign in</UButton>
        <UButton to="/forgot-password">Request new link</UButton>
      </div>
    </div>
    <UIcon v-else name="i-lucide-loader-circle" class="size-8 animate-spin text-(--ui-text-muted)" />
  </div>
</template>
