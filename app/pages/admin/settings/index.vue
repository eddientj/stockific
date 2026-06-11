<script setup lang="ts">
import { useSettings } from '~/composables/useSettings'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const { settings, saving, save } = useSettings()

const PAY_TERMS = ['Due on receipt', '7 days', '14 days', '30 days', '60 days', '90 days']

// ── Field schemas ─────────────────────────────────────────────
const BUSINESS_FIELDS = computed<FieldDef[]>(() => [
  { name: 'company_name', label: t('set.companyName'),  type: 'text',  placeholder: 'e.g. Stockific Sdn Bhd', span: 2 },
  { name: 'reg_number',   label: t('set.regNumber'),    type: 'text',  placeholder: 'e.g. 202301012345' },
  { name: 'email',        label: t('set.bizEmail'),     type: 'email', placeholder: 'hello@mybusiness.com' },
  { name: 'phone',        label: t('field.phone'),      type: 'phone' },
  { name: 'website',      label: t('set.website'),      type: 'url',   placeholder: 'https://mybusiness.com' },
  { name: 'address',      label: t('field.address'),    type: 'text',  placeholder: 'No. 1, Jalan Utama', span: 2 },
  { name: 'city',         label: t('field.city'),       type: 'text',  placeholder: 'Kuala Lumpur' },
  { name: 'postcode',     label: t('field.postcode'),   type: 'text',  placeholder: '50000' },
  { name: 'country',      label: t('set.country'),      type: 'text',  placeholder: 'Malaysia', span: 2 },
])

const INVOICE_FIELDS = computed<FieldDef[]>(() => [
  { name: 'invoice_prefix',        label: t('set.invPrefix'),   type: 'text',   placeholder: 'INV' },
  { name: 'default_tax_rate',      label: t('set.taxRate'),     type: 'number', min: 0, max: 100, decimals: 2, placeholder: '6' },
  { name: 'default_payment_terms', label: t('set.payTerms'),    type: 'select', span: 2,
    options: PAY_TERMS.map(v => ({ label: v, value: v })) },
  { name: 'invoice_notes', label: t('set.invNotes'), type: 'textarea',
    placeholder: 'e.g. Payment via online banking. Bank charges to be borne by the buyer.', rows: 3, span: 2 },
])

const BANK_FIELDS = computed<FieldDef[]>(() => [
  { name: 'bank_name',    label: t('set.bankName'),    type: 'text', placeholder: 'e.g. Maybank' },
  { name: 'bank_holder',  label: t('set.bankHolder'),  type: 'text', placeholder: 'Company or personal name' },
  { name: 'bank_account', label: t('set.bankAccount'), type: 'text', placeholder: 'e.g. 1234567890', span: 2 },
  { name: 'duitnow_id',   label: t('set.duitnow'),     type: 'text', placeholder: 'e.g. 0123456789 (phone or IC)', span: 2 },
])

const BRANDING_FIELDS = computed<FieldDef[]>(() => [
  { name: 'logo_url',     label: t('set.logo'),        type: 'image', span: 2 },
  { name: 'accent_color', label: t('set.accentColor'), type: 'color', span: 2 },
])

// ── Form state ────────────────────────────────────────────────
const form = reactive<Record<string, any>>({
  company_name:          '',
  reg_number:            '',
  email:                 '',
  phone:                 '',
  website:               '',
  address:               '',
  city:                  '',
  postcode:              '',
  country:               '',
  logo_url:              '',
  accent_color:          '#008080',
  invoice_prefix:        'INV',
  default_tax_rate:      6,
  default_payment_terms: '30 days',
  invoice_notes:         '',
  bank_name:             '',
  bank_account:          '',
  bank_holder:           '',
  duitnow_id:            '',
})

watch(settings, (s) => {
  if (!s) return
  Object.assign(form, {
    company_name:          s.company_name          ?? '',
    reg_number:            s.reg_number            ?? '',
    email:                 s.email                 ?? '',
    phone:                 s.phone                 ?? '',
    website:               s.website               ?? '',
    address:               s.address               ?? '',
    city:                  s.city                  ?? '',
    postcode:              s.postcode              ?? '',
    country:               s.country               ?? '',
    logo_url:              s.logo_url              ?? '',
    accent_color:          s.accent_color          ?? '#008080',
    invoice_prefix:        s.invoice_prefix        ?? 'INV',
    default_tax_rate:      s.default_tax_rate      ?? 6,
    default_payment_terms: s.default_payment_terms ?? '30 days',
    invoice_notes:         s.invoice_notes         ?? '',
    bank_name:             s.bank_name             ?? '',
    bank_account:          s.bank_account          ?? '',
    bank_holder:           s.bank_holder           ?? '',
    duitnow_id:            s.duitnow_id            ?? '',
  })
}, { immediate: true })

function updateForm(data: Record<string, any>) {
  Object.assign(form, data)
}

async function handleSave() {
  await save({
    company_name:          form.company_name          || 'My Business',
    reg_number:            form.reg_number            || null,
    email:                 form.email                 || null,
    phone:                 form.phone                 || null,
    website:               form.website               || null,
    address:               form.address               || null,
    city:                  form.city                  || null,
    postcode:              form.postcode              || null,
    country:               form.country               || 'Malaysia',
    logo_url:              form.logo_url              || null,
    accent_color:          form.accent_color          || '#008080',
    invoice_prefix:        form.invoice_prefix        || 'INV',
    default_tax_rate:      form.default_tax_rate,
    default_payment_terms: form.default_payment_terms || '30 days',
    invoice_notes:         form.invoice_notes         || null,
    bank_name:             form.bank_name             || null,
    bank_account:          form.bank_account          || null,
    bank_holder:           form.bank_holder           || null,
    duitnow_id:            form.duitnow_id            || null,
  } as any)
}
</script>

<template>
  <div class="space-y-6">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-semibold text-(--ui-text-highlighted)">{{ t('set.title') }}</h1>
        <p class="text-sm text-(--ui-text-muted) mt-0.5">{{ t('set.subtitle') }}</p>
      </div>
      <UButton :label="t('set.save')" icon="i-lucide-save" :loading="saving" @click="handleSave" />
    </div>

    <div class="grid grid-cols-1 xl:grid-cols-3 gap-6">

      <!-- Left column (2/3) -->
      <div class="xl:col-span-2 space-y-6">

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-building-2" class="size-4 text-(--ui-text-muted)" />
              <span class="font-medium text-(--ui-text-highlighted)">{{ t('set.bizInfo') }}</span>
            </div>
          </template>
          <AppForm :fields="BUSINESS_FIELDS" :model-value="form" @update:model-value="updateForm" />
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-file-text" class="size-4 text-(--ui-text-muted)" />
              <span class="font-medium text-(--ui-text-highlighted)">{{ t('set.invDefaults') }}</span>
            </div>
          </template>
          <AppForm :fields="INVOICE_FIELDS" :model-value="form" @update:model-value="updateForm" />
        </UCard>

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-landmark" class="size-4 text-(--ui-text-muted)" />
              <span class="font-medium text-(--ui-text-highlighted)">{{ t('set.bankDetails') }}</span>
            </div>
            <p class="text-xs text-(--ui-text-muted) mt-0.5">{{ t('set.bankSub') }}</p>
          </template>
          <AppForm :fields="BANK_FIELDS" :model-value="form" @update:model-value="updateForm" />
        </UCard>

      </div>

      <!-- Right column (1/3) -->
      <div class="space-y-6">

        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-palette" class="size-4 text-(--ui-text-muted)" />
              <span class="font-medium text-(--ui-text-highlighted)">{{ t('set.branding') }}</span>
            </div>
          </template>
          <AppForm :fields="BRANDING_FIELDS" :columns="1" :model-value="form" @update:model-value="updateForm" />
        </UCard>

        <!-- Live preview -->
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-lucide-eye" class="size-4 text-(--ui-text-muted)" />
              <span class="font-medium text-(--ui-text-highlighted)">{{ t('set.preview') }}</span>
            </div>
          </template>

          <div class="border border-(--ui-border) rounded-lg p-4 bg-(--ui-bg-muted) space-y-2">
            <template v-if="form.logo_url">
              <img :src="form.logo_url" alt="Logo" class="h-8 object-contain" />
            </template>
            <template v-else>
              <div class="flex items-center gap-2">
                <span class="w-[3px] h-4 rounded-full block" :style="{ background: form.accent_color }" />
                <span class="font-bold text-sm text-(--ui-text-highlighted)">{{ form.company_name || 'My Business' }}</span>
              </div>
            </template>
            <p v-if="form.address"  class="text-xs text-(--ui-text-muted)">{{ form.address }}</p>
            <p v-if="form.city"     class="text-xs text-(--ui-text-muted)">{{ form.city }}{{ form.postcode ? ', ' + form.postcode : '' }}</p>
            <p v-if="form.country"  class="text-xs text-(--ui-text-muted)">{{ form.country }}</p>
            <p v-if="form.email"    class="text-xs text-(--ui-text-muted)">{{ form.email }}</p>
            <p v-if="form.phone"    class="text-xs text-(--ui-text-muted)">{{ form.phone }}</p>
            <div class="flex items-center justify-end">
              <span class="text-xs font-mono font-semibold" :style="{ color: form.accent_color }">
                {{ form.invoice_prefix || 'INV' }}-{{ new Date().getFullYear() }}-XXXX
              </span>
            </div>
          </div>
        </UCard>

      </div>
    </div>

  </div>
</template>
