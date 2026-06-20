<script setup lang="ts">
export interface NavItem {
  to: string
  label: string
  icon: string
  exact?: boolean
}

export interface NavGroup {
  label?: string
  items: NavItem[]
}

defineProps<{
  groups: NavGroup[]
}>()

const collapsed = defineModel<boolean>('collapsed', { default: false })

// ── Width (persisted, only applies when expanded) ─────────────
const MIN_W  = 160
const MAX_W  = 360
const DEFAULT_W = 224

const sidebarWidth = ref(DEFAULT_W)

onMounted(() => {
  const storedW = localStorage.getItem('sidebar-width')
  if (storedW) sidebarWidth.value = Math.max(MIN_W, Math.min(MAX_W, Number(storedW)))
})

watch(sidebarWidth, w => localStorage.setItem('sidebar-width', String(w)))

// Computed style — collapsed is always 64px, expanded uses sidebarWidth
const sidebarStyle = computed(() =>
  collapsed.value
    ? { width: '64px' }
    : { width: `${sidebarWidth.value}px` }
)

// ── Drag-to-resize ────────────────────────────────────────────
const isDragging  = ref(false)
const dragStartX  = ref(0)
const dragStartW  = ref(0)

function onHandleMouseDown(e: MouseEvent) {
  e.preventDefault()
  isDragging.value  = true
  dragStartX.value  = e.clientX
  dragStartW.value  = collapsed.value ? 64 : sidebarWidth.value

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup',   onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value) return
  const delta   = e.clientX - dragStartX.value
  const newWidth = dragStartW.value + delta

  if (newWidth < 80) {
    // Snap-collapse when dragged very narrow
    if (!collapsed.value) collapsed.value = true
  } else if (newWidth >= MIN_W) {
    if (collapsed.value) collapsed.value = false
    sidebarWidth.value = Math.min(MAX_W, newWidth)
  }
}

function onMouseUp() {
  isDragging.value = false
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',   onMouseUp)
}

onUnmounted(() => {
  window.removeEventListener('mousemove', onMouseMove)
  window.removeEventListener('mouseup',   onMouseUp)
})
</script>

<template>
  <aside
    class="sidebar flex flex-col h-screen sticky top-0 shrink-0 relative"
    :style="sidebarStyle"
    :class="{ 'is-collapsed': collapsed, 'is-dragging': isDragging }"
  >
    <!-- Logo -->
    <div class="h-14 flex items-center border-b border-(--ui-border) px-3 shrink-0">
      <NuxtLink to="/" class="flex items-center overflow-hidden no-underline min-w-0">
        <img v-if="collapsed" src="/logo-icon.png" alt="Stockific" class="h-7 w-7 object-contain shrink-0" />
        <img v-else src="/logo.png" alt="Stockific" class="h-7 w-auto object-contain" />
      </NuxtLink>
    </div>

    <!-- Nav -->
    <nav class="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2" :class="collapsed ? 'space-y-0.5' : 'space-y-1'">
      <div v-for="group in groups" :key="group.label ?? '_'" :class="!collapsed ? 'mb-3' : ''">
        <p
          v-if="group.label && !collapsed"
          class="px-2 mb-0.5 text-[10px] font-semibold uppercase tracking-widest text-(--ui-text-muted) truncate"
        >{{ group.label }}</p>

        <div class="space-y-0.5">
          <UTooltip
            v-for="item in group.items"
            :key="item.to"
            :text="item.label"
            :disabled="!collapsed"
            side="right"
          >
            <NuxtLink
              :to="item.to"
              class="nav-item flex items-center gap-2.5 px-2 py-2 rounded-lg text-sm transition-colors no-underline"
              :class="collapsed ? 'justify-center' : ''"
              :exact-active-class="item.exact ? 'nav-active' : undefined"
              :active-class="item.exact ? undefined : 'nav-active'"
            >
              <UIcon :name="item.icon" class="size-4.5 shrink-0" />
              <span v-if="!collapsed" class="truncate">{{ item.label }}</span>
            </NuxtLink>
          </UTooltip>
        </div>
      </div>
    </nav>

    <!-- Collapse toggle -->
    <div class="border-t border-(--ui-border) p-2 shrink-0">
      <button
        class="collapse-btn w-full flex items-center gap-2 px-2 py-2 rounded-lg transition-colors"
        :class="collapsed ? 'justify-center' : ''"
        @click="collapsed = !collapsed"
      >
        <UIcon
          :name="collapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
          class="size-4 shrink-0"
        />
        <span v-if="!collapsed" class="text-xs truncate">Collapse</span>
      </button>
    </div>

    <!-- Resize handle -->
    <div
      class="resize-handle"
      @mousedown="onHandleMouseDown"
    />
  </aside>
</template>

<style scoped>
.sidebar {
  background: var(--ui-bg);
  border-right: 1px solid var(--ui-border);
  transition: width 0.2s ease;
}
.sidebar.is-dragging {
  /* Disable transition while dragging for immediate response */
  transition: none;
  user-select: none;
}

.nav-item {
  color: var(--ui-text-muted);
}
.nav-item:hover {
  color: var(--ui-text-highlighted);
  background: var(--ui-bg-elevated);
}
.nav-active {
  color: var(--color-brand-500);
  background: color-mix(in srgb, var(--color-brand-500) 12%, transparent);
  font-weight: 600;
}

.collapse-btn {
  color: var(--ui-text-muted);
}
.collapse-btn:hover {
  color: var(--ui-text-highlighted);
  background: var(--ui-bg-elevated);
}

/* Drag handle — sits on the right edge, inside sidebar bounds */
.resize-handle {
  position: absolute;
  top: 0;
  right: 0;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  z-index: 10;
  transition: background 0.15s;
}
.resize-handle:hover,
.sidebar.is-dragging .resize-handle {
  background: color-mix(in srgb, var(--color-brand-500) 50%, transparent);
}
</style>
