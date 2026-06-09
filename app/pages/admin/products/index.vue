<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import type { ProductRow, ExportColumn } from '~/types'

definePageMeta({ layout: 'admin' })

type Product = ProductRow
// Enriched row passed to the table — adds computed stock fields for sorting
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
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const liveStock = (p: any): number => (p.variants ?? []).reduce((s: number, v: any) => s + (v.stock_quantity - v.stock_on_hold), 0)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const onHold    = (p: any): number => (p.variants ?? []).reduce((s: number, v: any) => s + v.stock_on_hold, 0)
const ringgit   = (n: number)  => `RM ${Number(n).toFixed(2)}`

// ── Table data (enriched with computed sort fields) ───────────
const tableData = computed((): ProductTableRow[] =>
  filteredProducts.value.map(p => ({
    ...p,
    available: liveStock(p),
    on_hold:   onHold(p),
  }))
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

// ── Product slideover ──────────────────────────────────────────
const productSlideoverOpen = ref(false)
const editingProduct        = ref<Product | null>(null)
const saving                = ref(false)
const submitTrigger         = ref(0)

function openNew() {
  editingProduct.value = null
  productSlideoverOpen.value = true
}
function openEdit(p: Product) {
  editingProduct.value = p
  productSlideoverOpen.value = true
}

async function onFormSubmit(payload: Record<string, unknown>) {
  saving.value = true
  try {
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
    toast.add({ title: 'Bulk delete failed', description: e?.data?.statusMessage, color: 'error' })
  }
}

// ── Bulk edit ──────────────────────────────────────────────────
const bulkEditOpen = ref(false)
const bulkEditIds  = ref<string[]>([])

function openBulkEdit(ids: string[]) {
  bulkEditIds.value = ids
  bulkEditOpen.value = true
}

async function onBulkConfirm(patch: Record<string, unknown>, stockVal: number | null) {
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

// ── Import ─────────────────────────────────────────────────────
function handleImport(rows: Record<string, unknown>[]) {
  toast.add({
    title: `${rows.length} rows imported`,
    description: 'Import processing is not yet implemented.',
    color: 'info',
  })
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

      <!-- Empty states -->
      <template #empty>
        <div class="flex flex-col items-center py-16 gap-3">
          <UIcon name="i-lucide-package" class="size-10 text-(--ui-text-muted)" />
          <p class="font-medium text-(--ui-text-highlighted)">No products yet</p>
          <p class="text-sm text-(--ui-text-muted)">Add your first product to get started.</p>
          <UButton icon="i-lucide-plus" size="sm" class="mt-1" @click="openNew">New product</UButton>
        </div>
      </template>

      <!-- Product name + image -->
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

      <!-- Category chip -->
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

    <!-- ── Product slideover ───────────────────────────────── -->
    <AppSlideover
      v-model:open="productSlideoverOpen"
      :title="editingProduct ? editingProduct.name : 'New product'"
      :description="editingProduct ? 'Edit product details.' : 'Fill in the details for your new product.'"
      :submit-label="editingProduct ? 'Update' : 'Create product'"
      :loading="saving"
      @submit="submitTrigger++"
      @cancel="productSlideoverOpen = false"
    >
      <ProductForm
        :key="editingProduct?.id ?? 'new'"
        :trigger-submit="submitTrigger"
        :initial="editingProduct ? {
          name:        editingProduct.name,
          description: editingProduct.description ?? null,
          price:       Number(editingProduct.price),
          image_url:   editingProduct.image_url,
          category_id: editingProduct.category_id,
          is_active:   editingProduct.is_active,
          variants:    editingProduct.variants,
        } : undefined"
        @submit="onFormSubmit"
      />
    </AppSlideover>

    <!-- ── Filter slideover ────────────────────────────────── -->
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
        <UFormField label="Category" name="category">
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

        <UFormField label="Status" name="status">
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

        <UFormField label="Stock level" name="stock">
          <USelect
            v-model="filters.stock"
            :items="[
              { label: 'All',       value: 'all'     },
              { label: 'In stock',  value: 'instock' },
              { label: 'Low stock (< 5)', value: 'low' },
              { label: 'Out of stock',    value: 'out' },
            ]"
            class="w-full"
          />
        </UFormField>
      </div>
    </AppSlideover>

    <!-- ── Bulk edit modal ────────────────────────────────── -->
    <ProductBulkEditModal
      v-model:open="bulkEditOpen"
      :ids="bulkEditIds"
      :categories="categories ?? []"
      @confirm="onBulkConfirm"
    />

  </section>
</template>
