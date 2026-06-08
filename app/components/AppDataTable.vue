<script setup lang="ts" generic="TRow extends { id: string }">
import type { TableColumn } from '@nuxt/ui'
import type { ExportColumn } from '~/types'

type Row = Record<string, any>

const props = defineProps<{
  columns:          TableColumn<TRow>[]
  data:             TRow[]
  loading?:         boolean
  createLabel?:     string
  searchField?:     string | string[]
  activeFilters?:   number
  exportFilename?:  string
  exportColumns?:   ExportColumn[]
  exportData?:      Row[]  // Pre-processed flat rows for export (overrides data)
}>()

const emit = defineEmits<{
  create:        []
  filter:        []
  'bulk-delete': [ids: string[]]
  'bulk-edit':   [ids: string[]]
  import:        [rows: Row[]]
}>()

// ── Search ─────────────────────────────────────────────────
const search = ref('')

const searched = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return props.data
  const fields = Array.isArray(props.searchField)
    ? props.searchField
    : props.searchField ? [props.searchField] : []
  if (!fields.length) return props.data
  return props.data.filter(row =>
    fields.some(f => String((row as Row)[f] ?? '').toLowerCase().includes(q))
  )
})

// ── Pagination ─────────────────────────────────────────────
const PAGE_SIZE = 50
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(searched.value.length / PAGE_SIZE)))
const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return searched.value.slice(start, start + PAGE_SIZE)
})

watch([search, () => props.data], () => {
  page.value = 1
  selectedIds.value.clear()
})

const tableTop = ref<HTMLElement>()

function goToPage(p: number) {
  page.value = p
  selectedIds.value.clear()
  tableTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// ── Selection ──────────────────────────────────────────────
const selectedIds = ref(new Set<string>())
const allOnPageSelected = computed(
  () => paged.value.length > 0 && paged.value.every(r => selectedIds.value.has(r.id))
)
const someOnPageSelected = computed(
  () => paged.value.some(r => selectedIds.value.has(r.id)) && !allOnPageSelected.value
)

function toggleAll(e: Event) {
  const checked = (e.target as HTMLInputElement).checked
  if (checked) paged.value.forEach(r => selectedIds.value.add(r.id))
  else         paged.value.forEach(r => selectedIds.value.delete(r.id))
}

function toggleRow(id: string) {
  if (selectedIds.value.has(id)) selectedIds.value.delete(id)
  else                           selectedIds.value.add(id)
}

// ── Columns (prepend checkbox) ─────────────────────────────
const allColumns = computed<TableColumn<TRow>[]>(() => [
  { id: '_select', header: ' ', size: 40 } as TableColumn<TRow>,
  ...props.columns,
])

const parentSlots = useSlots()

// ── Export (SheetJS) ──────────────────────────────────────
async function handleExport() {
  const XLSX = await import('xlsx')
  const cols = props.exportColumns ?? []
  const pool = props.exportData ?? props.data
  const source = selectedIds.value.size > 0
    ? pool.filter(r => selectedIds.value.has(r.id))
    : pool
  const rows = source.map(r =>
    Object.fromEntries(cols.map(c => [c.label, (r as Row)[c.key]]))
  )
  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data')
  XLSX.writeFile(wb, `${props.exportFilename ?? 'export'}.xlsx`)
}

// ── Import (SheetJS) ──────────────────────────────────────
const importInput = ref<HTMLInputElement>()

async function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf)
  const ws = wb.Sheets[wb.SheetNames[0] ?? '']
  if (!ws) return
  const rows = XLSX.utils.sheet_to_json<Row>(ws)
  emit('import', rows)
  ;(e.target as HTMLInputElement).value = ''
}

// ── Bulk delete ────────────────────────────────────────────
function bulkDelete() {
  if (!selectedIds.value.size) return
  if (!confirm(`Delete ${selectedIds.value.size} item(s)? This cannot be undone.`)) return
  emit('bulk-delete', [...selectedIds.value])
  selectedIds.value.clear()
}
</script>

<template>
  <div ref="tableTop">
    <UCard padding="none">

      <!-- ── Toolbar ──────────────────────────────── -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--ui-border)">
        <UInput
          v-model="search"
          placeholder="Search…"
          icon="i-lucide-search"
          size="sm"
          class="w-56"
        />

        <div class="flex items-center gap-2">
          <!-- Filter -->
          <UButton
            variant="outline"
            color="neutral"
            icon="i-lucide-sliders-horizontal"
            size="sm"
            @click="emit('filter')"
          >
            Filters
            <UBadge v-if="activeFilters" :label="String(activeFilters)" color="primary" size="xs" class="ml-1" />
          </UButton>

          <!-- Import -->
          <label class="cursor-pointer">
            <UButton as="span" variant="outline" color="neutral" icon="i-lucide-upload" size="sm">
              Import
            </UButton>
            <input ref="importInput" type="file" accept=".xlsx,.csv" class="sr-only" @change="handleImportFile" />
          </label>

          <!-- Export -->
          <UButton
            v-if="exportColumns?.length"
            variant="outline"
            color="neutral"
            icon="i-lucide-download"
            size="sm"
            @click="handleExport"
          >
            Export
          </UButton>

          <!-- Create -->
          <UButton icon="i-lucide-plus" size="sm" @click="emit('create')">
            {{ createLabel ?? 'New' }}
          </UButton>
        </div>
      </div>

      <!-- ── Bulk action bar ──────────────────────── -->
      <Transition name="slide-down">
        <div
          v-if="selectedIds.size > 0"
          class="flex items-center gap-3 px-4 py-2 bg-brand-50 dark:bg-brand-950 border-b border-brand-200 dark:border-brand-800"
        >
          <span class="text-sm font-medium text-brand-700 dark:text-brand-300">
            {{ selectedIds.size }} selected
          </span>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-pencil"
            size="xs"
            @click="emit('bulk-edit', [...selectedIds])"
          >
            Edit selected
          </UButton>
          <UButton
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            size="xs"
            @click="bulkDelete"
          >
            Delete selected
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            class="ml-auto"
            @click="selectedIds.clear()"
          >
            Clear
          </UButton>
        </div>
      </Transition>

      <!-- ── Loading ──────────────────────────────── -->
      <div v-if="loading" class="py-16 text-center text-(--ui-text-muted) text-sm">Loading…</div>

      <!-- ── Table ────────────────────────────────── -->
      <UTable v-else :columns="allColumns" :data="paged">

        <!-- Checkbox header -->
        <template #_select-header>
          <input
            type="checkbox"
            :checked="allOnPageSelected"
            :indeterminate="someOnPageSelected"
            class="rounded border-(--ui-border) accent-brand-500 cursor-pointer"
            @change="toggleAll"
          />
        </template>

        <!-- Checkbox cell -->
        <template #_select-cell="{ row }">
          <input
            type="checkbox"
            :checked="selectedIds.has(row.original.id)"
            class="rounded border-(--ui-border) accent-brand-500 cursor-pointer"
            @change="() => toggleRow(row.original.id)"
          />
        </template>

        <!-- Forward all other slots from parent (Object.keys gives string[], avoids symbol/undefined) -->
        <template v-for="name in Object.keys(parentSlots)" :key="name" #[name]="slotData">
          <!-- eslint-disable-next-line @typescript-eslint/no-explicit-any -->
          <slot :name="name" v-bind="(slotData as any) ?? {}" />
        </template>

      </UTable>

      <!-- ── Pagination ───────────────────────────── -->
      <div
        v-if="totalPages > 1"
        class="flex items-center justify-between px-4 py-3 border-t border-(--ui-border)"
      >
        <p class="text-xs text-(--ui-text-muted)">
          {{ searched.length }} items · page {{ page }} of {{ totalPages }}
        </p>
        <UPagination
          :page="page"
          :total="searched.length"
          :items-per-page="PAGE_SIZE"
          size="sm"
          @update:page="goToPage"
        />
      </div>

    </UCard>
  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active { transition: all 0.15s ease; }
.slide-down-enter-from,
.slide-down-leave-to    { opacity: 0; transform: translateY(-6px); }
</style>
