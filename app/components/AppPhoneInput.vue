<script setup lang="ts">
import { vMaska } from 'maska/vue'

type PhoneCode = {
  name:     string
  code:     string
  emoji:    string
  dialCode: string
  mask:     string
}

// ── v-model ────────────────────────────────────────────────────
const model = defineModel<string>({ default: '' })

// ── Country selection ──────────────────────────────────────────
const countryCode = ref('MY')

const { data: phoneCodes, status, execute } = await useLazyFetch<PhoneCode[]>('/api/phone-codes', {
  key: 'api-phone-codes',
  immediate: false,
})

const country  = computed(() => phoneCodes.value?.find(c => c.code === countryCode.value))
const dialCode = computed(() => country.value?.dialCode  ?? '+60')
const mask     = computed(() => country.value?.mask      ?? '##-####-####')

function onOpen() {
  if (!phoneCodes.value?.length) execute()
}

// Reset the phone number when country changes
watch(countryCode, () => { model.value = '' })
</script>

<template>
  <UFieldGroup class="w-full">
    <!-- Country selector -->
    <USelectMenu
      v-model="countryCode"
      :items="phoneCodes ?? []"
      value-key="code"
      :search-input="{
        placeholder: 'Search country…',
        icon: 'i-lucide-search',
        loading: status === 'pending',
      }"
      :filter-fields="['name', 'code', 'dialCode']"
      :content="{ align: 'start' }"
      :ui="{
        base:         'pe-8',
        content:      'w-56',
        placeholder:  'hidden',
        trailingIcon: 'size-4',
      }"
      trailing-icon="i-lucide-chevrons-up-down"
      @update:open="onOpen"
    >
      <!-- Trigger: show flag emoji -->
      <span class="size-5 flex items-center text-lg leading-none">
        {{ country?.emoji ?? '🇲🇾' }}
      </span>

      <template #item-leading="{ item }">
        <span class="size-5 flex items-center text-lg leading-none">{{ item.emoji }}</span>
      </template>

      <template #item-label="{ item }">
        {{ item.name }} ({{ item.dialCode }})
      </template>
    </USelectMenu>

    <!-- Phone number input with mask -->
    <UInput
      v-model="model"
      v-maska="mask"
      type="tel"
      :placeholder="mask.replaceAll('#', '_')"
      :style="{ '--dial-code-length': `${dialCode.length + 1.5}ch` }"
      :ui="{
        base:    'ps-(--dial-code-length)',
        leading: 'pointer-events-none text-sm text-(--ui-text-muted)',
      }"
    >
      <template #leading>
        {{ dialCode }}
      </template>
    </UInput>
  </UFieldGroup>
</template>
