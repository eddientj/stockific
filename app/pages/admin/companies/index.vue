<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CompanyRow } from '~/types'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const toast = useAppToast()

const { companies, pending, createCompany, updateCompany, deleteCompany } = useCompanies()

// ── Slideover ─────────────────────────────────────────────────
const slideOpen = ref(false)
const editing   = ref<CompanyRow | null>(null)
const saving    = ref(false)

const form = ref({
  name: '', industry: '', website: '', phone: '', email: '', address: '', notes: '',
})

function openNew()                 { editing.value = null; slideOpen.value = true }
function openEdit(c: CompanyRow)   { editing.value = c;    slideOpen.value = true }

watch(slideOpen, (v) => {
  if (!v) return
  const c = editing.value
  form.value = {
    name:     c?.name     ?? '',
    industry: c?.industry ?? '',
    website:  c?.website  ?? '',
    phone:    c?.phone    ?? '',
    email:    c?.email    ?? '',
    address:  c?.address  ?? '',
    notes:    c?.notes    ?? '',
  }
})

async function save() {
  if (!form.value.name.trim()) {
    toast.error('Name is required')
    return
  }
  saving.value = true
  try {
    const payload = {
      name:     form.value.name.trim(),
      industry: form.value.industry || null,
      website:  form.value.website  || null,
      phone:    form.value.phone    || null,
      email:    form.value.email    || null,
      address:  form.value.address  || null,
      notes:    form.value.notes    || null,
    }
    if (editing.value) {
      await updateCompany(editing.value.id, payload)
    } else {
      await createCompany(payload)
    }
    slideOpen.value = false
  } catch (e: any) {
    toast.error('Failed to save', e?.data?.statusMessage ?? e?.message)
  } finally {
    saving.value = false
  }
}

// ── Table ─────────────────────────────────────────────────────
const columns = computed<TableColumn<CompanyRow>[]>(() => [
  { accessorKey: 'name',     header: t('company.colName'),     enableSorting: true  },
  { accessorKey: 'industry', header: t('company.colIndustry'), enableSorting: false },
  { accessorKey: 'phone',    header: t('company.colPhone'),    enableSorting: false },
  { accessorKey: 'email',    header: t('field.email'),         enableSorting: false },
  { id: 'actions', header: '' },
])
</script>

<template>
  <section>
    <AppPageHeader :title="t('company.title')" :description="t('company.subtitle')" />

    <AppDataTable
      :columns="columns"
      :data="companies ?? []"
      :loading="pending"
      :create-label="t('company.new')"
      search-field="name"
      @create="openNew"
    >
      <template #empty>
        <div class="flex flex-col items-center py-16 gap-3">
          <UIcon name="i-lucide-building-2" class="size-10 text-(--ui-text-muted)" />
          <p class="font-medium text-(--ui-text-highlighted)">{{ t('company.noCompanies') }}</p>
          <p class="text-sm text-(--ui-text-muted)">{{ t('company.noCompHint') }}</p>
          <UButton icon="i-lucide-plus" size="sm" class="mt-1" @click="openNew">{{ t('company.new') }}</UButton>
        </div>
      </template>

      <template #name-cell="{ row }">
        <span class="font-medium text-(--ui-text-highlighted)">{{ row.original.name }}</span>
      </template>

      <template #industry-cell="{ row }">
        <span class="text-(--ui-text-muted) text-sm">{{ row.original.industry ?? '—' }}</span>
      </template>

      <template #phone-cell="{ row }">
        <span class="text-(--ui-text-muted) text-sm">{{ row.original.phone ?? '—' }}</span>
      </template>

      <template #email-cell="{ row }">
        <span class="text-(--ui-text-muted) text-sm">{{ row.original.email ?? '—' }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton icon="i-lucide-pencil"  variant="ghost" color="neutral" size="sm" @click="openEdit(row.original)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error"   size="sm"
            @click="deleteCompany(row.original.id, row.original.name)" />
        </div>
      </template>
    </AppDataTable>

    <!-- Company form slideover -->
    <USlideover v-model:open="slideOpen" :title="editing ? editing.name : t('company.new')">
      <template #body>
        <div class="space-y-4 p-4">
          <UFormField :label="t('field.name')" required>
            <UInput v-model="form.name" placeholder="Acme Sdn Bhd" class="w-full" />
          </UFormField>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('company.industry')">
              <UInput v-model="form.industry" placeholder="Technology, Retail…" class="w-full" />
            </UFormField>
            <UFormField :label="t('company.website')">
              <UInput v-model="form.website" placeholder="https://example.com" class="w-full" />
            </UFormField>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <UFormField :label="t('field.phone')">
              <UInput v-model="form.phone" placeholder="+60 3 1234 5678" class="w-full" />
            </UFormField>
            <UFormField :label="t('field.email')">
              <UInput v-model="form.email" type="email" placeholder="info@company.com" class="w-full" />
            </UFormField>
          </div>
          <UFormField :label="t('field.address')">
            <UInput v-model="form.address" placeholder="No 12, Jalan Puteri 2, Puchong" class="w-full" />
          </UFormField>
          <UFormField :label="t('field.notes')">
            <UTextarea v-model="form.notes" :rows="3" placeholder="Any notes about this company…" class="w-full" />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2 p-4">
          <UButton :loading="saving" @click="save">
            {{ editing ? t('action.save') : t('company.new') }}
          </UButton>
          <UButton variant="outline" color="neutral" @click="slideOpen = false">{{ t('action.cancel') }}</UButton>
        </div>
      </template>
    </USlideover>
  </section>
</template>
