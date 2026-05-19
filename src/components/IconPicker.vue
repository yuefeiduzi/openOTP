<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { AccountIcon } from '@/types'
import { getInitialStyle } from '@/utils/icons'

const props = defineProps<{
  modelValue: AccountIcon
  accountName?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: AccountIcon]
}>()

const EMOJIS = [
  '🤖', '🔑', '🔒', '📱', '💻', '🔐',
  '🛡️', '🏦', '💰', '💳', '📧', '🗝️',
  '🔗', '⚙️', '🎮', '🌐', '📦', '🔔',
  '🔕', '✉️', '📋', '📊', '📈', '🔵',
  '🟢', '🔴', '🟡', '🟣', '🟠', '🟤',
  '⚫️', '🔶', '🔷', '⭐', '💎', '🔥',
]

const COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
  '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
  '#BB8FCE', '#85C1E9', '#F8C471', '#E59866',
]

const activeTab = ref<'emoji' | 'initial' | 'image'>(props.modelValue.type || 'emoji')
const localIcon = ref<AccountIcon>({ ...props.modelValue })
const fileInput = ref<HTMLInputElement | null>(null)

watch(() => props.modelValue, (val) => {
  localIcon.value = { ...val }
  activeTab.value = val.type
})

const initialLetter = computed(() => {
  if (props.accountName) {
    return props.accountName.charAt(0).toUpperCase()
  }
  return 'A'
})

const initialPreviewStyle = computed(() => {
  return getInitialStyle({
    ...localIcon.value,
    type: 'initial',
  })
})

function selectEmoji(emoji: string) {
  localIcon.value = { type: 'emoji', value: emoji, bgColor: '' }
}

function selectColor(color: string) {
  localIcon.value = { type: 'initial', value: '', bgColor: color }
}

function confirmSelection() {
  emit('update:modelValue', { ...localIcon.value })
}

function cancelSelection() {
  emit('update:modelValue', { ...props.modelValue })
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    localIcon.value = { type: 'image', value: file.name, bgColor: '' }
  }
}
</script>

<template>
  <div class="icon-picker">
    <div class="preview-section">
      <div class="preview-label">预览</div>
      <div class="preview-icon">
        <span v-if="localIcon.type === 'emoji'" class="preview-emoji">{{ localIcon.value }}</span>
        <div v-else-if="localIcon.type === 'initial'" :style="initialPreviewStyle" class="preview-initial">
          {{ initialLetter }}
        </div>
        <div v-else class="preview-image">
          <span v-if="localIcon.value">{{ localIcon.value }}</span>
          <span v-else>?</span>
        </div>
      </div>
    </div>

    <div class="tab-bar">
      <button
        :class="['tab-btn', { active: activeTab === 'emoji' }]"
        @click="activeTab = 'emoji'"
      >
        Emoji
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'initial' }]"
        @click="activeTab = 'initial'"
      >
        首字母
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'image' }]"
        @click="activeTab = 'image'"
      >
        图片
      </button>
    </div>

    <div v-if="activeTab === 'emoji'" class="emoji-grid">
      <button
        v-for="emoji in EMOJIS"
        :key="emoji"
        :class="['emoji-item', { selected: localIcon.type === 'emoji' && localIcon.value === emoji }]"
        @click="selectEmoji(emoji)"
      >
        {{ emoji }}
      </button>
    </div>

    <div v-if="activeTab === 'initial'" class="initial-tab">
      <div class="color-label">选择背景颜色</div>
      <div class="color-grid">
        <button
          v-for="color in COLORS"
          :key="color"
          :class="['color-item', { selected: localIcon.type === 'initial' && localIcon.bgColor === color }]"
          :style="{ backgroundColor: color }"
          @click="selectColor(color)"
        />
      </div>
    </div>

    <div v-if="activeTab === 'image'" class="image-tab">
      <button class="upload-btn" @click="triggerFileInput">
        选择图片
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".png,.svg"
        style="display: none"
        @change="handleFileSelected"
      />
      <p class="image-hint">支持 PNG / SVG 格式</p>
    </div>

    <div class="actions">
      <button class="btn btn-cancel" @click="cancelSelection">取消</button>
      <button class="btn btn-confirm" @click="confirmSelection">确认</button>
    </div>
  </div>
</template>

<style scoped>
.icon-picker {
  width: 350px;
  padding: 20px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.preview-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eee;
}

.preview-label {
  font-size: 14px;
  color: #666;
}

.preview-emoji {
  font-size: 32px;
}

.preview-initial {
  flex-shrink: 0;
}

.preview-image {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #999;
}

.tab-bar {
  display: flex;
  margin-bottom: 16px;
  border-radius: 8px;
  background: #f5f5f5;
  padding: 3px;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.tab-btn.active {
  background: #fff;
  color: #333;
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.emoji-item {
  width: 44px;
  height: 44px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: #f9f9f9;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.emoji-item:hover {
  background: #f0f0f0;
}

.emoji-item.selected {
  border-color: #4A90D9;
  background: #eef5ff;
}

.initial-tab {
  margin-bottom: 16px;
}

.color-label {
  font-size: 13px;
  color: #666;
  margin-bottom: 12px;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.color-item {
  width: 44px;
  height: 44px;
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

.image-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding: 24px 0;
}

.upload-btn {
  padding: 10px 24px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.upload-btn:hover {
  border-color: #4A90D9;
  color: #4A90D9;
}

.image-hint {
  font-size: 12px;
  color: #999;
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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

.btn-confirm {
  border: none;
  background: #4A90D9;
  color: #fff;
}

.btn-confirm:hover {
  background: #3a7bc8;
}
</style>
