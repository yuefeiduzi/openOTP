<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Account, AccountIcon } from '@/types'
import IconDisplay from '@/components/IconDisplay.vue'
import BottomSheet from '@/components/BottomSheet.vue'
import IconPicker from '@/components/IconPicker.vue'

const props = defineProps<{
  visible: boolean
  account: Account | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<Account>]
}>()

const { t } = useI18n()
const editName = ref('')
const editIssuer = ref('')
const editNotes = ref('')
const showIconPicker = ref(false)
/** Set once the user actually picks an icon; until then the stored icon is preserved verbatim. */
const pickedIcon = ref<AccountIcon | null>(null)

watch(() => props.visible, (val) => {
  if (val && props.account) {
    editName.value = props.account.name
    editIssuer.value = props.account.issuer
    editNotes.value = props.account.notes || ''
    pickedIcon.value = null
    showIconPicker.value = false
  }
}, { immediate: true })

/** The icon as it will be saved: the stored one untouched, or the picked one. */
const effectiveIcon = computed<AccountIcon | null>(() => {
  return pickedIcon.value ?? props.account?.icon ?? null
})

function applyPickedIcon(icon: AccountIcon) {
  pickedIcon.value = { ...icon }
  showIconPicker.value = false
}

function handleSave() {
  if (!props.account) return

  emit('save', {
    id: props.account.id,
    name: editName.value,
    issuer: editIssuer.value,
    notes: editNotes.value,
    icon: { ...(effectiveIcon.value ?? props.account.icon) },
  })
}

function handleCancel() {
  emit('close')
}
</script>

<template>
  <div v-if="visible" class="overlay" @click.self="handleCancel">
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">{{ t('editAccount.title') }}</h2>
      </div>

      <div class="field-group">
        <label class="field-label">{{ t('editAccount.accountName') }}</label>
        <input v-model="editName" type="text" class="input" />
      </div>

      <div class="field-group">
        <label class="field-label">{{ t('editAccount.issuer') }}</label>
        <input v-model="editIssuer" type="text" class="input" />
      </div>

      <div class="field-group">
        <label class="field-label">{{ t('editAccount.notes') }}</label>
        <textarea
          v-model="editNotes"
          class="input textarea"
          rows="2"
          :placeholder="t('editAccount.notesPlaceholder')"
        />
      </div>

      <div class="field-group">
        <label class="field-label">{{ t('editAccount.icon') }}</label>
        <div class="current-icon" @click="showIconPicker = true">
          <IconDisplay :icon="effectiveIcon" :name="editName" />
          <button class="edit-icon-btn">{{ t('editAccount.changeIcon') }}</button>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-cancel" @click="handleCancel">{{ t('common.cancel') }}</button>
        <button class="btn btn-save" @click="handleSave">{{ t('common.save') }}</button>
      </div>
    </div>

    <BottomSheet
      :visible="showIconPicker"
      :title="t('editAccount.changeIcon')"
      hide-actions
      @close="showIconPicker = false"
    >
      <IconPicker
        :model-value="effectiveIcon ?? account?.icon ?? { type: 'initial', value: '', bgColor: '' }"
        :account-name="editName"
        @update:model-value="applyPickedIcon"
      />
    </BottomSheet>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: var(--overlay);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--z-modal);
}

.modal {
  background: var(--card-bg);
  color: var(--text-primary);
  border-radius: 12px;
  padding: 20px;
  width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18);
}

.modal-header {
  margin-bottom: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: var(--text-primary);
}

.field-group {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 13px;
  color: var(--text-primary);
  background: var(--bg-secondary);
  box-sizing: border-box;
  transition: border-color 0.15s;
  font-family: inherit;
}

.input:focus {
  outline: none;
  border-color: var(--accent);
}

.textarea {
  resize: vertical;
  min-height: 44px;
}

.current-icon {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: var(--bg-secondary);
  border-radius: 8px;
  cursor: pointer;
}

.icon-emoji {
  font-size: 24px;
  line-height: 1;
}

.icon-preview-img {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: contain;
  background: var(--card-bg);
}

.edit-icon-btn {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  font-size: 12px;
  color: var(--btn-secondary-text);
  cursor: pointer;
  transition: all 0.15s;
}

.edit-icon-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.icon-editor {
  margin-top: 10px;
  padding: 12px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

.icon-type-tabs {
  display: flex;
  margin-bottom: 12px;
  border-radius: 6px;
  background: var(--border-color);
  padding: 2px;
}

.icon-type-btn {
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: var(--btn-secondary-text);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.icon-type-btn.active {
  background: var(--card-bg);
  color: var(--text-primary);
  font-weight: 500;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
}

.color-item {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 3px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
}

.color-item:hover {
  transform: scale(1.1);
}

.color-item.selected {
  border-color: var(--text-primary);
  transform: scale(1.1);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.btn-cancel {
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--btn-secondary-text);
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-save {
  border: none;
  background: var(--accent);
  color: #fff;
}

.btn-save:hover {
  opacity: 0.85;
}
</style>
