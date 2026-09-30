<script setup lang="ts">
import { computed, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  visible: boolean
  /** Viewport coordinates of the right click that opened the menu. */
  x: number
  y: number
}>()

const emit = defineEmits<{
  close: []
  delete: []
}>()

const { t } = useI18n()

/**
 * The menu is a small fixed-size chip, so the clamp uses its rendered size
 * instead of measuring it: a right click near the window edge must still leave
 * the whole menu on screen.
 */
const MENU_WIDTH = 150
const MENU_HEIGHT = 44
const EDGE_GAP = 8

const style = computed(() => ({
  left: `${Math.max(EDGE_GAP, Math.min(props.x, window.innerWidth - MENU_WIDTH - EDGE_GAP))}px`,
  top: `${Math.max(EDGE_GAP, Math.min(props.y, window.innerHeight - MENU_HEIGHT - EDGE_GAP))}px`,
}))

/** Escape closes the menu from anywhere; the overlay only handles the mouse. */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
  }
}

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      document.addEventListener('keydown', handleKeydown)
    } else {
      document.removeEventListener('keydown', handleKeydown)
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <!-- 全屏透明层接住「点别处」：关闭菜单的那一下不该同时落到下面的卡片上 -->
    <div
      v-if="visible"
      class="context-menu-overlay"
      @mousedown.self="emit('close')"
      @contextmenu.prevent.self="emit('close')"
    >
      <div class="context-menu" role="menu" :style="style" @contextmenu.prevent>
        <button class="context-menu-item" role="menuitem" @click="emit('delete')">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
          </svg>
          <span>{{ t('common.delete') }}</span>
        </button>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.context-menu-overlay {
  position: fixed;
  inset: 0;
  /* 卡片菜单压过列表，但要让位给确认弹窗与 BottomSheet */
  z-index: var(--z-menu);
}

.context-menu {
  position: fixed;
  min-width: 150px;
  padding: 4px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
}

.context-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  border-radius: 6px;
  background: none;
  color: var(--progress-red);
  font-size: 13px;
  white-space: nowrap;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.context-menu-item:hover {
  background: var(--bg-secondary);
}
</style>