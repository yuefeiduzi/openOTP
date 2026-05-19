<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Account, AccountIcon } from '@/types'

const props = defineProps<{
  visible: boolean
  account: Account | null
}>()

const emit = defineEmits<{
  close: []
  save: [data: Partial<Account>]
}>()

const editName = ref('')
const editIssuer = ref('')
const showIconEditor = ref(false)
const iconType = ref<'emoji' | 'initial'>('emoji')
const emojiValue = ref('')
const bgColor = ref('')

const PRESET_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#E59866',
]

watch(() => props.visible, (val) => {
  if (val && props.account) {
    editName.value = props.account.name
    editIssuer.value = props.account.issuer
    iconType.value = props.account.icon.type === 'image'
      ? 'emoji'
      : props.account.icon.type
    emojiValue.value = props.account.icon.type === 'emoji' ? props.account.icon.value : ''
    bgColor.value = props.account.icon.bgColor || '#4A90D9'
    showIconEditor.value = false
  }
})

function handleSave() {
  if (!props.account) return

  const icon: AccountIcon = {
    type: iconType.value,
    value: iconType.value === 'emoji' ? emojiValue.value : editName.value.charAt(0).toUpperCase(),
    bgColor: iconType.value === 'initial' ? bgColor.value : '',
  }

  emit('save', {
    id: props.account.id,
    name: editName.value,
    issuer: editIssuer.value,
    icon,
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
        <h2 class="modal-title">编辑账号</h2>
      </div>

      <div class="field-group">
        <label class="field-label">账号名称</label>
        <input v-model="editName" type="text" class="input" />
      </div>

      <div class="field-group">
        <label class="field-label">发行方</label>
        <input v-model="editIssuer" type="text" class="input" />
      </div>

      <div class="field-group">
        <label class="field-label">图标</label>
        <div class="current-icon" @click="showIconEditor = !showIconEditor">
          <span v-if="iconType === 'emoji'" class="icon-emoji">{{ emojiValue || (account?.icon.type === 'emoji' ? account.icon.value : '🔑') }}</span>
          <div
            v-else
            class="icon-initial"
            :style="{ backgroundColor: bgColor, color: '#fff', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 'bold' }"
          >
            {{ editName ? editName.charAt(0).toUpperCase() : '?' }}
          </div>
          <button class="edit-icon-btn">修改图标</button>
        </div>

        <div v-if="showIconEditor" class="icon-editor">
          <div class="icon-type-tabs">
            <button
              :class="['icon-type-btn', { active: iconType === 'emoji' }]"
              @click="iconType = 'emoji'"
            >
              Emoji
            </button>
            <button
              :class="['icon-type-btn', { active: iconType === 'initial' }]"
              @click="iconType = 'initial'"
            >
              首字母
            </button>
          </div>

          <div v-if="iconType === 'emoji'" class="field-group">
            <label class="field-label">Emoji</label>
            <input v-model="emojiValue" type="text" class="input" placeholder="选择一个 emoji" maxlength="2" />
          </div>

          <div v-if="iconType === 'initial'" class="field-group">
            <label class="field-label">背景颜色</label>
            <div class="color-grid">
              <button
                v-for="color in PRESET_COLORS"
                :key="color"
                :class="['color-item', { selected: bgColor === color }]"
                :style="{ backgroundColor: color }"
                @click="bgColor = color"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-cancel" @click="handleCancel">取消</button>
        <button class="btn btn-save" @click="handleSave">保存</button>
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
  z-index: 100;
}

.modal {
  background: #fff;
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
  color: #222;
}

.field-group {
  margin-bottom: 12px;
}

.field-label {
  display: block;
  font-size: 12px;
  color: #888;
  margin-bottom: 4px;
}

.input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 13px;
  color: #333;
  background: #fff;
  box-sizing: border-box;
  transition: border-color 0.15s;
}

.input:focus {
  outline: none;
  border-color: #4A90D9;
}

.current-icon {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  background: #f9f9f9;
  border-radius: 8px;
  cursor: pointer;
}

.icon-emoji {
  font-size: 24px;
  line-height: 1;
}

.edit-icon-btn {
  margin-left: auto;
  padding: 4px 12px;
  border: 1px solid #ddd;
  border-radius: 6px;
  background: #fff;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  transition: all 0.15s;
}

.edit-icon-btn:hover {
  border-color: #4A90D9;
  color: #4A90D9;
}

.icon-editor {
  margin-top: 10px;
  padding: 12px;
  background: #f9f9f9;
  border-radius: 8px;
}

.icon-type-tabs {
  display: flex;
  margin-bottom: 12px;
  border-radius: 6px;
  background: #eee;
  padding: 2px;
}

.icon-type-btn {
  flex: 1;
  padding: 6px 0;
  border: none;
  background: transparent;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.15s;
}

.icon-type-btn.active {
  background: #fff;
  color: #333;
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
  border-color: #333;
  transform: scale(1.1);
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.btn {
  padding: 8px 20px;
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

.btn-save {
  border: none;
  background: #4A90D9;
  color: #fff;
}

.btn-save:hover {
  background: #3a7bc8;
}
</style>
