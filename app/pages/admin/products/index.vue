<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ProductRow, ExportColumn } from '~/types'
import type { FieldDef } from '~/types/form'

definePageMeta({ layout: 'admin' })

type Product = ProductRow
type ProductTableRow = Product & { available: number; on_hold: number }

const toast = useAppToast()

// ── Data ──────────────────────────────────────────────────────
const { data: allProducts, refresh, pending } = await useFetch<Product[]>('/api/products')
const { data: categories } = await useFetch<{ id: string; name: string }[]>('/api/categories')

// ── Filters ───────────────────────────────────────────────────
const filters = reactive({
  categoryIds: [] as string[],
  status:      'all' as 'all' | 'active' | 'inactive',
  stock:       'all' as 'all' | 'instock' | 'low' | 'out',
})

const activeFilterCount = computed(() =>
  (filters.categoryIds.length > 0 ? 1 : 0) +
  (filters.status !== 'all' ? 1 : 0) +
  (filters.stock  !== 'all' ? 1 : 0)
)

const filteredProducts = computed(() => {
  let rows = allProducts.value ?? []
  if (filters.categoryIds.length > 0)
    rows = rows.filter(p => filters.categoryIds.includes(p.category_id ?? ''))
  if (filters.status === 'active')   rows = rows.filter(p => p.is_active)
  if (filters.status === 'inactive') rows = rows.filter(p => !p.is_active)
  if (filters.stock === 'instock') rows = rows.filter(p => liveStock(p) > 0)
  if (filters.stock === 'low')     rows = rows.filter(p => liveStock(p) > 0 && liveStock(p) < 5)
  if (filters.stock === 'out')     rows = rows.filter(p => liveStock(p) === 0)
  return rows
})

function resetFilters() {
  filters.categoryIds = []
  filters.status = 'all'
  filters.stock  = 'all'
}

// ── Helpers ───────────────────────────────────────────────────
const liveStock = (p: any): number => (p.variants ?? []).reduce((s: number, v: any) => s + (v.stock_quantity - v.stock_on_hold), 0)
const onHold    = (p: any): number => (p.variants ?? []).reduce((s: number, v: any) => s + v.stock_on_hold, 0)
const ringgit   = (n: number)  => `RM ${Number(n).toFixed(2)}`

const tableData = computed((): ProductTableRow[] =>
  filteredProducts.value.map(p => ({ ...p, available: liveStock(p), on_hold: onHold(p) }))
)

// ── Table columns ─────────────────────────────────────────────
const columns: TableColumn<ProductTableRow>[] = [
  { accessorKey: 'name',      header: 'Product',   enableSorting: true  },
  { accessorKey: 'category',  header: 'Category',  enableSorting: false },
  { accessorKey: 'price',     header: 'Price',     enableSorting: true  },
  { accessorKey: 'available', header: 'Available', enableSorting: true  },
  { accessorKey: 'on_hold',   header: 'On Hold',   enableSorting: true  },
  { accessorKey: 'status',    header: 'Status',    enableSorting: false },
  { id: 'actions',            header: ''           },
]

const exportColumns: ExportColumn[] = [
  { key: 'name',        label: 'Product'     },
  { key: 'description', label: 'Description' },
  { key: 'category',    label: 'Category'    },
  { key: 'price',       label: 'Price (RM)'  },
  { key: 'stock',       label: 'Stock'       },
  { key: 'on_hold',     label: 'On Hold'     },
  { key: 'status',      label: 'Status'      },
]

const exportData = computed(() =>
  tableData.value.map(p => ({
    id:          p.id,
    name:        p.name,
    description: p.description ?? '',
    category:    p.categories?.name ?? '',
    price:       Number(p.price).toFixed(2),
    stock:       p.available,
    on_hold:     p.on_hold,
    status:      p.is_active ? 'Listed' : 'Unlisted',
  }))
)

// ── Product form schema (dynamic — categories loaded async) ────
const productFields = computed((): FieldDef[] => [
  { name: 'name',           label: 'Name',        type: 'text',     required: true, placeholder: 'e.g. Scarlet & Violet Booster Pack', span: 2 },
  { name: 'description',    label: 'Description', type: 'textarea', placeholder: 'Optional product description…', rows: 3, span: 2 },
  { name: 'price',          label: 'Price (RM)',  type: 'number',   min: 0, max: 1000000, decimals: 2, placeholder: '0.00', mono: true },
  { name: 'category_id',    label: 'Category',    type: 'select',   placeholder: '— None —', options: [
    { label: '— None —', value: null },
    ...(categories.value ?? []).map(c => ({ label: c.name, value: c.id })),
  ]},
  { name: 'is_active',      label: 'Status',      type: 'select',   options: [
    { label: 'Listed for sale', value: true  },
    { label: 'Unlisted',        value: false },
  ]},
  { name: 'stock_quantity', label: 'Stock',   type: 'number', min: 0, max: 99999, help: 'Total units on hand' },
  { name: 'stock_on_hold',  label: 'On Hold', type: 'number', min: 0, max: 99999, help: 'Reserved for unpaid orders' },
  { name: 'image_url',      label: 'Image',        type: 'image',   span: 2 },
])

// ── Product slideover ──────────────────────────────────────────
const productSlideoverOpen = ref(false)
const editingProduct       = ref<Product | null>(null)
const saving               = ref(false)

const form = ref<Record<string, any>>({
  name: '', description: '', price: 0, image_url: '',
  category_id: null, is_active: true, stock_quantity: 0, stock_on_hold: 0,
})

function openNew()          { editingProduct.value = null; productSlideoverOpen.value = true }
function openEdit(p: Product) { editingProduct.value = p;  productSlideoverOpen.value = true }

watch(productSlideoverOpen, (v) => {
  if (!v) return
  const p = editingProduct.value
  form.value = {
    name:           p?.name ?? '',
    description:    p?.description ?? '',
    price:          p ? Number(p.price) : 0,
    image_url:      p?.image_url ?? '',
    category_id:    p?.category_id ?? null,
    is_active:      p ? p.is_active : true,
    stock_quantity: p?.variants?.[0]?.stock_quantity ?? 0,
    stock_on_hold:  p?.variants?.[0]?.stock_on_hold  ?? 0,
  }
})

async function save() {
  if (!form.value.name.trim()) {
    toast.add({ title: 'Product name is required', color: 'error' })
    return
  }
  if ((form.value.stock_on_hold ?? 0) > (form.value.stock_quantity ?? 0)) {
    toast.add({ title: 'On Hold cannot exceed Stock', color: 'error' })
    return
  }
  saving.value = true
  try {
    const payload = {
      name:        form.value.name.trim(),
      description: form.value.description || null,
      price:       Number(form.value.price),
      image_url:   form.value.image_url || null,
      category_id: form.value.category_id ?? null,
      is_active:   form.value.is_active !== false,
      variants: [{
        id:             editingProduct.value?.variants?.[0]?.id,
        name:           'Default',
        stock_quantity: Number(form.value.stock_quantity),
        stock_on_hold:  Number(form.value.stock_on_hold),
      }],
    }
    if (editingProduct.value) {
      await $fetch(`/api/products/${editingProduct.value.id}`, { method: 'PATCH', body: payload })
      toast.add({ title: 'Changes saved', color: 'success', icon: 'i-lucide-check' })
    } else {
      await $fetch('/api/products', { method: 'POST', body: payload })
      toast.add({ title: 'Product created', color: 'success', icon: 'i-lucide-check' })
    }
    productSlideoverOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Failed to save', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  } finally {
    saving.value = false
  }
}

// ── Delete ─────────────────────────────────────────────────────
async function deleteProduct(id: string, name: string) {
  if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
  try {
    await $fetch(`/api/products/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Product deleted', color: 'success', icon: 'i-lucide-check' })
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Delete failed', description: e?.data?.statusMessage, color: 'error' })
  }
}

async function bulkDelete(ids: string[]) {
  try {
    await Promise.all(ids.map(id => $fetch(`/api/products/${id}`, { method: 'DELETE' })))
    toast.add({ title: `${ids.length} products deleted`, color: 'success', icon: 'i-lucide-check' })
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Bulk delete failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  }
}

// ── Bulk edit ──────────────────────────────────────────────────
const bulkEditOpen   = ref(false)
const bulkEditIds    = ref<string[]>([])
const bulkEditStep   = ref<'edit' | 'confirm'>('edit')
const NO_CHANGE      = '__nochange__'
const bulkEditFields = reactive({
  category_id: NO_CHANGE,
  is_active:   NO_CHANGE,
  price:       '' as string | number,
  stock:       '' as string | number,
})

function openBulkEdit(ids: string[]) {
  bulkEditIds.value = ids
  bulkEditOpen.value = true
}

watch(bulkEditOpen, (v) => {
  if (v) {
    bulkEditFields.category_id = NO_CHANGE
    bulkEditFields.is_active   = NO_CHANGE
    bulkEditFields.price       = ''
    bulkEditFields.stock       = ''
    bulkEditStep.value = 'edit'
  }
})

function blockBulkE(e: KeyboardEvent) {
  if (['e', 'E', '+', '-'].includes(e.key)) e.preventDefault()
}

function clampBulkPrice(e: Event) {
  const el = e.target as HTMLInputElement
  if (el.value === '') { bulkEditFields.price = ''; return }
  const v = Math.max(0, Math.min(1_000_000, Number(Number(el.value).toFixed(2)) || 0))
  el.value = String(v); bulkEditFields.price = v
}

function clampBulkStock(e: Event) {
  const el = e.target as HTMLInputElement
  if (el.value === '') { bulkEditFields.stock = ''; return }
  const v = Math.max(0, Math.min(99999, Math.floor(Number(el.value) || 0)))
  el.value = String(v); bulkEditFields.stock = v
}

const bulkChangeSummary = computed(() => {
  const lines: string[] = []
  if (bulkEditFields.category_id !== NO_CHANGE) {
    const label = bulkEditFields.category_id === 'null'
      ? 'Remove category'
      : (categories.value ?? []).find(c => c.id === bulkEditFields.category_id)?.name ?? bulkEditFields.category_id
    lines.push(`Category → ${label}`)
  }
  if (bulkEditFields.is_active !== NO_CHANGE)
    lines.push(`Status → ${bulkEditFields.is_active === 'true' ? 'Listed' : 'Unlisted'}`)
  if (bulkEditFields.price !== '' && !isNaN(Number(bulkEditFields.price)))
    lines.push(`Price → RM ${Number(bulkEditFields.price).toFixed(2)}`)
  if (bulkEditFields.stock !== '' && !isNaN(Number(bulkEditFields.stock)))
    lines.push(`Stock → ${bulkEditFields.stock}`)
  return lines
})

function bulkRequestConfirm() {
  if (!bulkChangeSummary.value.length) {
    toast.add({ title: 'No changes selected', description: 'Set at least one field before applying.', color: 'warning' })
    return
  }
  bulkEditStep.value = 'confirm'
}

async function bulkDoConfirm() {
  const patch: Record<string, unknown> = {}
  if (bulkEditFields.category_id !== NO_CHANGE) patch.category_id = bulkEditFields.category_id === 'null' ? null : bulkEditFields.category_id
  if (bulkEditFields.is_active   !== NO_CHANGE) patch.is_active   = bulkEditFields.is_active === 'true'
  if (bulkEditFields.price !== '' && !isNaN(Number(bulkEditFields.price))) patch.price = Number(bulkEditFields.price)
  const stockVal = bulkEditFields.stock !== '' && !isNaN(Number(bulkEditFields.stock)) ? Number(bulkEditFields.stock) : null
  try {
    await Promise.all(bulkEditIds.value.map(async (id) => {
      if (Object.keys(patch).length > 0)
        await $fetch(`/api/products/${id}`, { method: 'PATCH', body: patch })
      if (stockVal !== null) {
        const product = (allProducts.value ?? []).find(p => p.id === id)
        await $fetch(`/api/products/${id}`, {
          method: 'PATCH',
          body: {
            variants: [{
              id:             product?.variants?.[0]?.id,
              name:           'Default',
              stock_quantity: stockVal,
              stock_on_hold:  product?.variants?.[0]?.stock_on_hold ?? 0,
            }],
          },
        })
      }
    }))
    toast.add({ title: `${bulkEditIds.value.length} products updated`, color: 'success', icon: 'i-lucide-check' })
    bulkEditOpen.value = false
    await refresh()
  } catch (e: any) {
    toast.add({ title: 'Bulk edit failed', description: e?.data?.statusMessage ?? e?.message, color: 'error' })
  }
}

// ── Filter slideover ───────────────────────────────────────────
const filterSlideoverOpen = ref(false)

function handleImport(rows: Record<string, unknown>[]) {
  toast.add({ title: `${rows.length} rows imported`, description: 'Import processing is not yet implemented.', color: 'info' })
}
</script>

<template>
  <section>
    <AppPageHeader title="Products" description="Manage your inventory." />

    <AppDataTable
      :columns="columns"
      :data="tableData"
      :loading="pending"
      create-label="New product"
      search-field="name"
      filterable
      :active-filters="activeFilterCount"
      export-filename="products"
      :export-columns="exportColumns"
      :export-data="exportData"
      @create="openNew"
      @filter="filterSlideoverOpen = true"
      @bulk-delete="bulkDelete"
      @bulk-edit="openBulkEdit"
      @import="handleImport"
    >
      <template #empty>
        <div class="flex flex-col items-center py-16 gap-3">
          <UIcon name="i-lucide-package" class="size-10 text-(--ui-text-muted)" />
          <p class="font-medium text-(--ui-text-highlighted)">No products yet</p>
          <p class="text-sm text-(--ui-text-muted)">Add your first product to get started.</p>
          <UButton icon="i-lucide-plus" size="sm" class="mt-1" @click="openNew">New product</UButton>
        </div>
      </template>

      <template #name-cell="{ row }">
        <div class="flex items-center gap-3">
          <UAvatar
            :src="row.original.image_url ?? undefined"
            :alt="row.original.name"
            :icon="row.original.image_url ? undefined : 'i-lucide-image'"
            size="sm"
          />
          <span class="font-medium text-(--ui-text-highlighted)">{{ row.original.name }}</span>
        </div>
      </template>

      <template #category-cell="{ row }">
        <span
          v-if="row.original.categories"
          class="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-300 border border-brand-200 dark:border-brand-800"
        >
          {{ row.original.categories.name }}
        </span>
        <span v-else class="text-(--ui-text-muted)">—</span>
      </template>

      <template #price-cell="{ row }">
        <span>{{ ringgit(row.original.price) }}</span>
      </template>

      <template #available-cell="{ row }">
        <span :class="row.original.available < 5 ? 'text-warning-600 font-medium' : ''">
          {{ row.original.available }}
        </span>
      </template>

      <template #on_hold-cell="{ row }">
        <span class="text-(--ui-text-muted)">{{ row.original.on_hold }}</span>
      </template>

      <template #status-cell="{ row }">
        <AppStatusBadge :active="row.original.is_active" inactive-label="Unlisted" />
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton icon="i-lucide-pencil" variant="ghost" color="neutral" size="sm" @click="openEdit(row.original)" />
          <UButton icon="i-lucide-trash-2" variant="ghost" color="error" size="sm" @click="deleteProduct(row.original.id, row.original.name)" />
        </div>
      </template>
    </AppDataTable>

    <!-- Product form slideover -->
    <AppFormSlideover
      :title="editingProduct ? editingProduct.name : 'New product'"
      :fields="productFields"
      v-model="form"
      v-model:open="productSlideoverOpen"
      :loading="saving"
      :save-label="editingProduct ? 'Update' : 'Create product'"
      @save="save"
    />

    <!-- Filter slideover -->
    <AppSlideover
      v-model:open="filterSlideoverOpen"
      title="Filter products"
      description="Narrow down the product list."
      submit-label="Apply"
      cancel-label="Reset"
      @submit="filterSlideoverOpen = false"
      @cancel="resetFilters"
    >
      <div class="space-y-5">
        <UFormField label="Category">
          <USelectMenu
            v-model="filters.categoryIds"
            :items="(categories ?? []).map(c => ({ label: c.name, value: c.id }))"
            multiple
            searchable
            searchable-placeholder="Search categories…"
            placeholder="All categories"
            value-key="value"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Status">
          <USelect
            v-model="filters.status"
            :items="[
              { label: 'All',      value: 'all'      },
              { label: 'Listed',   value: 'active'   },
              { label: 'Unlisted', value: 'inactive' },
            ]"
            class="w-full"
          />
        </UFormField>

        <UFormField label="Stock level">
          <USelect
            v-model="filters.stock"
            :items="[
              { label: 'All',             value: 'all'     },
              { label: 'In stock',        value: 'instock' },
              { label: 'Low stock (< 5)', value: 'low'     },
              { label: 'Out of stock',    value: 'out'     },
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </AppSlideover>

    <!-- Bulk edit — step 1: edit -->
    <UModal :open="bulkEditOpen && bulkEditStep === 'edit'" @update:open="bulkEditOpen = $event">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-pencil" class="size-5 text-brand-500" />
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Edit {{ bulkEditIds.length }} products</h3>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-(--ui-text-muted) mb-5">
          Leave a field on <strong class="text-(--ui-text)">No change</strong> to keep each product's current value.
        </p>
        <div class="space-y-4">
          <UFormField label="Category">
            <USelect
              v-model="bulkEditFields.category_id"
              :items="[
                { label: '— No change —',   value: NO_CHANGE },
                { label: 'Remove category', value: 'null'    },
                ...(categories ?? []).map(c => ({ label: c.name, value: c.id })),
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Status">
            <USelect
              v-model="bulkEditFields.is_active"
              :items="[
                { label: '— No change —',   value: NO_CHANGE },
                { label: 'Listed for sale', value: 'true'    },
                { label: 'Unlisted',        value: 'false'   },
              ]"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Price (RM)">
            <UInput
              :value="bulkEditFields.price"
              type="number" min="0" max="1000000" step="0.01"
              placeholder="Leave blank for no change"
              class="w-full"
              @keydown="blockBulkE"
              @input="clampBulkPrice($event)"
            />
          </UFormField>
          <UFormField label="Stock quantity">
            <UInput
              :value="bulkEditFields.stock"
              type="number" min="0" max="99999"
              placeholder="Leave blank for no change"
              class="w-full"
              @keydown="blockBulkE"
              @input="clampBulkStock($event)"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex gap-2">
          <UButton icon="i-lucide-arrow-right" color="primary" @click="bulkRequestConfirm">Apply to all {{ bulkEditIds.length }}</UButton>
          <UButton variant="outline" color="neutral" @click="bulkEditOpen = false">Cancel</UButton>
        </div>
      </template>
    </UModal>

    <!-- Bulk edit — step 2: confirm -->
    <UModal :open="bulkEditOpen && bulkEditStep === 'confirm'" @update:open="bulkEditOpen = $event">
      <template #header>
        <div class="flex items-center gap-2">
          <UIcon name="i-lucide-triangle-alert" class="size-5 text-warning-500" />
          <h3 class="text-base font-semibold text-(--ui-text-highlighted)">Confirm bulk update</h3>
        </div>
      </template>
      <template #body>
        <p class="text-sm text-(--ui-text-muted) mb-4">
          You are about to apply the following changes to
          <strong class="text-(--ui-text)">{{ bulkEditIds.length }} products</strong>. This cannot be undone.
        </p>
        <ul class="space-y-1.5">
          <li v-for="line in bulkChangeSummary" :key="line" class="flex items-center gap-2 text-sm">
            <UIcon name="i-lucide-circle-arrow-right" class="size-4 text-brand-500 shrink-0" />
            <span class="text-(--ui-text-highlighted) font-medium">{{ line }}</span>
          </li>
        </ul>
      </template>
      <template #footer>
        <div class="flex gap-2">
          <UButton icon="i-lucide-check" color="primary" @click="bulkDoConfirm">Confirm</UButton>
          <UButton variant="outline" color="neutral" @click="bulkEditStep = 'edit'">Back</UButton>
        </div>
      </template>
    </UModal>

  </section>
</template>
