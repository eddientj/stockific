<script setup lang="ts" generic="TRow extends { id: string }">
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'
import type { ExportColumn } from '~/types'

const { t } = useLocale()

type Row = Record<string, any>

const props = defineProps<{
  columns:          TableColumn<TRow>[]
  data:             TRow[]
  loading?:         boolean
  createLabel?:     string
  searchField?:     string | string[]
  filterable?:      boolean
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

// ── Sorting ────────────────────────────────────────────────
type SortEntry = { id: string; desc: boolean }
const sorting = ref<SortEntry[]>([])

const sorted = computed(() => {
  const [s] = sorting.value
  if (!s) return searched.value
  return [...searched.value].sort((a, b) => {
    const av = (a as Row)[s.id]
    const bv = (b as Row)[s.id]
    if (typeof av === 'number' && typeof bv === 'number')
      return s.desc ? bv - av : av - bv
    return s.desc
      ? String(bv ?? '').localeCompare(String(av ?? ''))
      : String(av ?? '').localeCompare(String(bv ?? ''))
  })
})

// ── Pagination ─────────────────────────────────────────────
const PAGE_SIZE = 50
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(sorted.value.length / PAGE_SIZE)))
const paged = computed(() => {
  const start = (page.value - 1) * PAGE_SIZE
  return sorted.value.slice(start, start + PAGE_SIZE)
})

watch([search, () => props.data], () => {
  page.value = 1
  selectedIds.value.clear()
})

watch(sorting, () => { page.value = 1 })

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

// ── Columns (prepend checkbox + inject sort buttons) ───────
// resolveComponent must be called in setup scope (not inside computed getter)
const UIconComp = resolveComponent('UIcon')

const allColumns = computed<TableColumn<TRow>[]>(() => [
  { id: '_select', header: ' ', size: 40 } as TableColumn<TRow>,
  ...props.columns.map(col => {
    if (!col.enableSorting) return col as TableColumn<TRow>
    const label = typeof col.header === 'string' ? col.header : ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const colId: string = (col as any).accessorKey ?? col.id ?? ''
    return {
      ...col,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      header: ({ column }: any) => {
        const s = sorting.value.find(e => e.id === colId)
        const icon = s?.desc
          ? 'i-lucide-arrow-down-narrow-wide'
          : s
            ? 'i-lucide-arrow-up-narrow-wide'
            : 'i-lucide-arrow-up-down'
        return h(
          'button',
          {
            type: 'button',
            class: 'flex items-center gap-1.5 group outline-none',
            onClick: column.getToggleSortingHandler(),
          },
          [
            h('span', label),
            h(UIconComp, {
              name: icon,
              class: s
                ? 'size-3.5 text-(--ui-text-highlighted)'
                : 'size-3.5 text-(--ui-text-muted) opacity-30 group-hover:opacity-70 transition-opacity',
            }),
          ],
        )
      },
    } as TableColumn<TRow>
  }),
])

const parentSlots = useSlots()

// ── Export / Import (via useXlsx) ─────────────────────────
const { exportSheet, importSheet } = useXlsx()

async function handleExport() {
  const cols   = props.exportColumns ?? []
  const pool   = props.exportData ?? props.data
  const source = selectedIds.value.size > 0
    ? pool.filter(r => selectedIds.value.has(r.id))
    : pool
  const rows = source.map(r =>
    Object.fromEntries(cols.map(c => [c.label, (r as Row)[c.key]]))
  )
  await exportSheet(rows, props.exportFilename ?? 'export')
}

const importInput = ref<HTMLInputElement>()

async function handleImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const rows = await importSheet<Row>(file)
  emit('import', rows)
  ;(e.target as HTMLInputElement).value = ''
}

// ── Bulk delete ────────────────────────────────────────────
const deleteConfirmOpen = ref(false)

function bulkDelete() {
  if (!selectedIds.value.size) return
  deleteConfirmOpen.value = true
}

function confirmBulkDelete() {
  emit('bulk-delete', [...selectedIds.value])
  selectedIds.value.clear()
  deleteConfirmOpen.value = false
}
</script>

<template>
  <div ref="tableTop">
    <UCard padding="none">

      <!-- ── Toolbar ──────────────────────────────── -->
      <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-(--ui-border)">
        <UInput
          v-model="search"
          :placeholder="t('action.search') + '…'"
          icon="i-lucide-search"
          size="sm"
          class="w-56"
        />

        <div class="flex items-center gap-2">
          <!-- Filter (only shown when page opts in with filterable prop) -->
          <UButton
            v-if="filterable"
            variant="outline"
            color="neutral"
            icon="i-lucide-sliders-horizontal"
            size="sm"
            @click="emit('filter')"
          >
            {{ t('action.filter') }}
            <UBadge v-if="activeFilters" :label="String(activeFilters)" color="primary" size="xs" class="ml-1" />
          </UButton>

          <!-- Import -->
          <label class="cursor-pointer">
            <UButton as="span" variant="outline" color="neutral" icon="i-lucide-upload" size="sm">
              {{ t('action.import') }}
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
            {{ t('action.export') }}
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
            {{ selectedIds.size }} {{ t('table.selected') }}
          </span>
          <UButton
            variant="ghost"
            color="neutral"
            icon="i-lucide-pencil"
            size="xs"
            @click="emit('bulk-edit', [...selectedIds])"
          >
            {{ t('table.editSelected') }}
          </UButton>
          <UButton
            variant="ghost"
            color="error"
            icon="i-lucide-trash-2"
            size="xs"
            @click="bulkDelete"
          >
            {{ t('table.deleteSelected') }}
          </UButton>
          <UButton
            variant="ghost"
            color="neutral"
            size="xs"
            class="ml-auto"
            @click="selectedIds.clear()"
          >
            {{ t('table.clear') }}
          </UButton>
        </div>
      </Transition>

      <!-- ── Loading ──────────────────────────────── -->
      <div v-if="loading" class="py-16 text-center text-(--ui-text-muted) text-sm">{{ t('table.loading') }}</div>

      <!-- ── Table ────────────────────────────────── -->
      <UTable
        v-else
        :columns="allColumns"
        :data="paged"
        v-model:sorting="sorting"
        :sorting-options="{ manualSorting: true }"
      >

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
          {{ sorted.length }} {{ t('table.items') }} · {{ t('table.page') }} {{ page }} {{ t('table.of') }} {{ totalPages }}
        </p>
        <UPagination
          :page="page"
          :total="sorted.length"
          :items-per-page="PAGE_SIZE"
          size="sm"
          @update:page="goToPage"
        />
      </div>

    </UCard>

    <!-- ── Bulk delete confirmation ───────────────────── -->
    <UModal v-model:open="deleteConfirmOpen" :title="t('table.confirmDelete')" :ui="{ footer: 'justify-end' }">
      <template #body>
        <p class="text-sm text-(--ui-text-muted)">
          {{ t('table.deleteWarning', { n: selectedIds.size }) }}
        </p>
      </template>
      <template #footer>
        <UButton variant="outline" color="neutral" @click="deleteConfirmOpen = false">{{ t('action.cancel') }}</UButton>
        <UButton color="error" icon="i-lucide-trash-2" @click="confirmBulkDelete">{{ t('action.delete') }}</UButton>
      </template>
    </UModal>

  </div>
</template>

<style scoped>
.slide-down-enter-active,
.slide-down-leave-active { transition: all 0.15s ease; }
.slide-down-enter-from,
.slide-down-leave-to    { opacity: 0; transform: translateY(-6px); }
</style>
