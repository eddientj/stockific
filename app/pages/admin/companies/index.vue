<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { CompanyRow, ExportColumn } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

const { t } = useLocale()
const toast = useAppToast()

const { companies, pending, refresh, createCompany, updateCompany } = useCompanies()

const FIELDS = computed<FieldDef[]>(() => [
  { name: 'name',     label: t('field.name'),       type: 'text',     required: true, span: 2, placeholder: 'Acme Sdn Bhd' },
  { name: 'industry', label: t('company.industry'), type: 'text',     placeholder: 'Technology, Retail…' },
  { name: 'website',  label: t('company.website'),  type: 'url',      placeholder: 'https://example.com' },
  { name: 'phone',    label: t('field.phone'),      type: 'phone' },
  { name: 'email',    label: t('field.email'),      type: 'email',    placeholder: 'info@company.com' },
  { name: 'address',  label: t('field.address'),    type: 'text',     span: 2, placeholder: 'No 12, Jalan Puteri 2, Puchong' },
  { name: 'notes',    label: t('field.notes'),      type: 'textarea', rows: 3, span: 2, placeholder: 'Any notes about this company…' },
])

async function bulkDelete(ids: string[]) {
  try {
    await Promise.all(ids.map(id => $fetch(`/api/crm/companies/${id}`, { method: 'DELETE' })))
    toast.success(`${ids.length} companies deleted`)
    await refresh()
  } catch (e: any) {
    toast.error('Bulk delete failed', e?.data?.statusMessage ?? e?.message)
  }
}

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

const exportColumns: ExportColumn[] = [
  { key: 'name',     label: 'Company'  },
  { key: 'industry', label: 'Industry' },
  { key: 'website',  label: 'Website'  },
  { key: 'phone',    label: 'Phone'    },
  { key: 'email',    label: 'Email'    },
  { key: 'address',  label: 'Address'  },
]
const exportData = computed(() =>
  (companies.value ?? []).map(c => ({
    id:       c.id,
    name:     c.name,
    industry: c.industry ?? '',
    website:  c.website ?? '',
    phone:    c.phone ?? '',
    email:    c.email ?? '',
    address:  c.address ?? '',
  })),
)

// ── Filter (industry) ─────────────────────────────────────────
const filterOpen = ref(false)
const filters = reactive({ industries: [] as string[] })
const activeFilterCount = computed(() => (filters.industries.length > 0 ? 1 : 0))
const industryOptions = computed(() => {
  const list = [...new Set((companies.value ?? []).map(c => c.industry).filter(Boolean) as string[])]
  return list.sort().map(i => ({ label: i, value: i }))
})
const filteredCompanies = computed(() => {
  let rows = companies.value ?? []
  if (filters.industries.length) rows = rows.filter(c => c.industry && filters.industries.includes(c.industry))
  return rows
})
function resetFilters() { filters.industries = [] }
</script>

<template>
  <section>
    <AppPageHeader :title="t('company.title')" :description="t('company.subtitle')" />

    <AppDataTable
      :columns="columns"
      :data="filteredCompanies"
      :loading="pending"
      :create-label="t('company.new')"
      search-field="name"
      filterable
      :active-filters="activeFilterCount"
      export-filename="companies"
      :export-columns="exportColumns"
      :export-data="exportData"
      empty-icon="i-lucide-building-2"
      :empty-title="t('company.noCompanies')"
      :empty-hint="t('company.noCompHint')"
      @create="openNew"
      @filter="filterOpen = true"
      @bulk-delete="bulkDelete"
    >
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
          <UTooltip :text="t('action.edit')">
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="sm" @click="openEdit(row.original)" />
          </UTooltip>
          <UTooltip :text="t('action.delete')">
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm"
              @click="bulkDelete([row.original.id])" />
          </UTooltip>
        </div>
      </template>
    </AppDataTable>

    <!-- Company form slideover -->
    <AppFormSlideover
      v-model="form"
      v-model:open="slideOpen"
      :title="editing ? editing.name : t('company.new')"
      :fields="FIELDS"
      :loading="saving"
      :save-label="editing ? t('action.save') : t('company.new')"
      @save="save"
    />

    <!-- Industry filter slideover -->
    <AppSlideover
      v-model:open="filterOpen"
      :title="t('company.filter')"
      :description="t('company.filterHint')"
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterOpen = false"
      @cancel="resetFilters"
    >
      <UFormField :label="t('company.industry')">
        <USelectMenu
          v-model="filters.industries"
          :items="industryOptions"
          multiple
          value-key="value"
          :placeholder="t('company.industry')"
          class="w-full"
        />
      </UFormField>
    </AppSlideover>
  </section>
</template>
