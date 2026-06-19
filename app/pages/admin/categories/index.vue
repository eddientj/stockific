<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { FieldDef } from '~/types/form'
import type { ExportColumn } from '~/types'

definePageMeta({ layout: 'admin' })

const { t }  = useLocale()
const toast  = useAppToast()

interface Category { id: string; name: string; product_count: number }

const { data: categories, refresh } = await useFetch<Category[]>('/api/categories')

// ── Create / edit form ────────────────────────────────────────
const slideOpen = ref(false)
const editing   = ref<Category | null>(null)
const saving    = ref(false)
const form      = ref<Record<string, any>>({ name: '' })

const FIELDS = computed<FieldDef[]>(() => [
  { name: 'name', label: t('cat.name'), type: 'text', required: true, span: 2, placeholder: 'e.g. Trading Cards' },
])

function openCreate() { editing.value = null; form.value = { name: '' }; slideOpen.value = true }
function openEdit(c: Category) { editing.value = c; form.value = { name: c.name }; slideOpen.value = true }

async function save() {
  const name = String(form.value.name ?? '').trim()
  if (!name) { toast.error(t('cat.name') + ' is required'); return }
  saving.value = true
  try {
    if (editing.value) {
      await $fetch(`/api/categories/${editing.value.id}`, { method: 'PATCH', body: { name } })
      toast.success(`"${name}" updated`)
    } else {
      await $fetch('/api/categories', { method: 'POST', body: { name } })
      toast.success(`"${name}" created`)
    }
    slideOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.error('Failed to save', e?.data?.statusMessage ?? e?.message)
  } finally {
    saving.value = false
  }
}

async function bulkDelete(ids: string[]) {
  try {
    await Promise.all(ids.map(id => $fetch(`/api/categories/${id}`, { method: 'DELETE' })))
    toast.success(`${ids.length} ${ids.length === 1 ? 'category' : 'categories'} deleted`)
    await refresh()
  } catch (e: any) {
    toast.error('Delete failed', e?.data?.statusMessage ?? e?.message)
  }
}

const columns = computed<TableColumn<Category>[]>(() => [
  { accessorKey: 'name',          header: t('cat.colName'),     enableSorting: true },
  { accessorKey: 'product_count', header: t('cat.colProducts'), enableSorting: true },
  { id: 'actions',                header: ''                                        },
])

const exportColumns: ExportColumn[] = [
  { key: 'name',          label: 'Category' },
  { key: 'product_count', label: 'Products' },
]
const exportData = computed(() =>
  (categories.value ?? []).map(c => ({ id: c.id, name: c.name, product_count: c.product_count })),
)

// ── Filter (product status) ───────────────────────────────────
const filterOpen     = ref(false)
const productFilter  = ref<'all' | 'has' | 'empty'>('all')
const activeFilterCount = computed(() => (productFilter.value !== 'all' ? 1 : 0))
const filteredCategories = computed(() => {
  const list = categories.value ?? []
  if (productFilter.value === 'has')   return list.filter(c => c.product_count > 0)
  if (productFilter.value === 'empty') return list.filter(c => c.product_count === 0)
  return list
})
const productFilterOptions = computed(() => [
  { label: t('cat.filterAll'),   value: 'all'   },
  { label: t('cat.filterHas'),   value: 'has'   },
  { label: t('cat.filterEmpty'), value: 'empty' },
])
function resetFilters() { productFilter.value = 'all' }
</script>

<template>
  <section>
    <AppPageHeader :title="t('cat.title')" :description="t('cat.subtitle')" />

    <AppDataTable
      :columns="columns"
      :data="filteredCategories"
      :create-label="t('cat.new')"
      search-field="name"
      filterable
      :active-filters="activeFilterCount"
      export-filename="categories"
      :export-columns="exportColumns"
      :export-data="exportData"
      empty-icon="i-lucide-tag"
      :empty-title="t('cat.empty')"
      @create="openCreate"
      @filter="filterOpen = true"
      @bulk-delete="bulkDelete"
    >
      <template #name-cell="{ row }">
        <span class="font-medium text-(--ui-text-highlighted)">{{ row.original.name }}</span>
      </template>

      <template #product_count-cell="{ row }">
        <UBadge
          :label="`${row.original.product_count} ${row.original.product_count === 1 ? 'product' : 'products'}`"
          variant="soft"
          color="neutral"
        />
      </template>

      <template #actions-cell="{ row }">
        <div class="flex items-center justify-end gap-1">
          <UTooltip :text="t('action.edit')">
            <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="sm" @click="openEdit(row.original)" />
          </UTooltip>
          <UTooltip :text="t('action.delete')">
            <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="bulkDelete([row.original.id])" />
          </UTooltip>
        </div>
      </template>

    </AppDataTable>

    <AppFormSlideover
      v-model="form"
      v-model:open="slideOpen"
      :title="editing ? editing.name : t('cat.newTitle')"
      :fields="FIELDS"
      :loading="saving"
      :save-label="editing ? t('cat.saveChanges') : t('cat.create')"
      @save="save"
    />

    <!-- Product-status filter slideover -->
    <AppSlideover
      v-model:open="filterOpen"
      :title="t('cat.filter')"
      :description="t('cat.filterHint')"
      :submit-label="t('action.apply')"
      :cancel-label="t('action.reset')"
      @submit="filterOpen = false"
      @cancel="resetFilters"
    >
      <UFormField :label="t('cat.colProducts')">
        <USelect v-model="productFilter" :items="productFilterOptions" class="w-full" />
      </UFormField>
    </AppSlideover>
  </section>
</template>
