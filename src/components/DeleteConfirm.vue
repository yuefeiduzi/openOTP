<script setup lang="ts">
import { useI18n } from 'vue-i18n'

defineProps<{
  visible: boolean
  accountName: string
}>()

const emit = defineEmits<{
  close: []
  confirm: []
}>()

const { t } = useI18n()
</script>

<template>
  <div v-if="visible" class="overlay" @click.self="emit('close')">
    <div class="dialog">
      <div class="icon-wrapper">
        <span class="warning-icon">⚠️</span>
      </div>
      <p class="message">{{ t('deleteConfirm.message', { name: accountName }) }}</p>
      <p class="subtitle">{{ t('deleteConfirm.warning') }}</p>
      <div class="actions">
        <button class="btn btn-cancel" @click="emit('close')">{{ t('common.cancel') }}</button>
        <button class="btn btn-delete" @click="emit('confirm')">{{ t('common.delete') }}</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.dialog {
  background: #fff;
  border-radius: 12px;
  padding: 24px 20px 20px;
  width: 320px;
  max-width: 90vw;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.icon-wrapper {
  margin-bottom: 12px;
}

.warning-icon {
  font-size: 36px;
}

.message {
  font-size: 15px;
  color: #333;
  margin: 0 0 6px;
  line-height: 1.5;
}

.message strong {
  color: #222;
}

.subtitle {
  font-size: 13px;
  color: #999;
  margin: 0 0 20px;
}

.actions {
  display: flex;
  gap: 10px;
  justify-content: center;
}

.btn {
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  border: 1px solid #ddd;
  background: #fff;
  color: #666;
}

.btn-cancel:hover {
  background: #f5f5f5;
}

.btn-delete {
  border: none;
  background: #F44336;
  color: #fff;
}

.btn-delete:hover {
  background: #d32f2f;
}
</style>
