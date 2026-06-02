<script setup lang="ts">
defineProps<{
  visible: boolean
  title: string
  confirmText?: string
  cancelText?: string
  confirmDisabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm'): void
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="sheet">
      <div v-if="visible" class="bottom-sheet-overlay" @click.self="emit('close')">
        <div class="bottom-sheet">
          <div class="sheet-header">
            <h3 class="sheet-title">{{ title }}</h3>
          </div>

          <div class="sheet-content">
            <slot />
          </div>

          <div class="sheet-actions">
            <button class="sheet-btn cancel" @click="emit('close')">
              {{ cancelText || '取消' }}
            </button>
            <button
              class="sheet-btn confirm"
              :disabled="confirmDisabled"
              @click="emit('confirm')"
            >
              {{ confirmText || '确认' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.bottom-sheet-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.bottom-sheet {
  width: 100%;
  max-height: 66vh;
  background: #fff;
  border-radius: 20px 20px 0 0;
  display: flex;
  flex-direction: column;
  padding: 8px 0 env(safe-area-inset-bottom, 0) 0;
}

.sheet-header {
  padding: 12px 24px 0;
}

.sheet-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.sheet-content {
  padding: 20px 24px;
  flex: 1;
  overflow-y: auto;
}

.sheet-actions {
  display: flex;
  gap: 12px;
  padding: 16px 24px;
  padding-bottom: max(16px, env(safe-area-inset-bottom, 16px));
}

.sheet-btn {
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  cursor: pointer;
  transition: background 0.2s;
}

.sheet-btn.cancel {
  background: #f0f0f0;
  color: #666;
}

.sheet-btn.confirm {
  background: #4a90d9;
  color: #fff;
}

.sheet-btn.confirm:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.sheet-btn.confirm:not(:disabled):hover {
  background: #3a7bc8;
}

.sheet-btn.cancel:hover {
  background: #e4e4e4;
}

.sheet-enter-active,
.sheet-leave-active {
  transition: opacity 0.3s ease;
}

.sheet-enter-active .bottom-sheet,
.sheet-leave-active .bottom-sheet {
  transition: transform 0.3s ease;
}

.sheet-enter-from,
.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .bottom-sheet,
.sheet-leave-to .bottom-sheet {
  transform: translateY(100%);
}
</style>
