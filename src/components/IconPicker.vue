<script setup lang="ts">
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { AccountIcon, IconType } from '@/types'
import IconDisplay from '@/components/IconDisplay.vue'
import { PRESET_ICONS } from '@/utils/presetIcons'

const { t } = useI18n()

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

const activeTab = ref<IconType>(props.modelValue.type || 'emoji')
const localIcon = ref<AccountIcon>({ ...props.modelValue })
const fileInput = ref<HTMLInputElement | null>(null)
const imageError = ref('')

watch(() => props.modelValue, (val) => {
  localIcon.value = { ...val }
  activeTab.value = val.type
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

function selectPreset(name: string) {
  imageError.value = ''
  localIcon.value = { type: 'preset', value: name, bgColor: '' }
}

function triggerFileInput() {
  fileInput.value?.click()
}

function handleFileSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (file.size > 200 * 1024) {
    imageError.value = t('iconPicker.imageTooLarge')
    input.value = ''
    return
  }
  imageError.value = ''
  const reader = new FileReader()
  reader.onload = () => {
    localIcon.value = { type: 'image', value: String(reader.result), bgColor: '' }
  }
  reader.readAsDataURL(file)
  input.value = ''
}
</script>

<template>
  <div class="icon-picker">
    <div class="preview-section">
      <div class="preview-label">{{ t('iconPicker.preview') }}</div>
      <div class="preview-icon">
        <IconDisplay :icon="localIcon" :name="accountName" :size="36" />
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
        {{ t('editAccount.initial') }}
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'image' }]"
        @click="activeTab = 'image'"
      >
        {{ t('iconPicker.image') }}
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'preset' }]"
        @click="activeTab = 'preset'"
      >
        {{ t('iconPicker.preset') }}
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

    <div v-if="activeTab === 'preset'" class="preset-grid">
      <button
        v-for="icon in PRESET_ICONS"
        :key="icon.name"
        :class="['preset-item', { selected: localIcon.type === 'preset' && localIcon.value === icon.name }]"
        :title="icon.name"
        @click="selectPreset(icon.name)"
      >
        <img :src="icon.url" :alt="icon.name" />
      </button>
    </div>

    <div v-if="activeTab === 'image'" class="image-tab">
      <button class="upload-btn" @click="triggerFileInput">
        {{ t('iconPicker.selectImage') }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".png,.svg"
        style="display: none"
        @change="handleFileSelected"
      />
      <p class="image-hint">{{ t('iconPicker.imageHint') }}</p>
      <p v-if="imageError" class="image-error">{{ imageError }}</p>
    </div>

    <div class="actions">
      <button class="btn btn-cancel" @click="cancelSelection">{{ t('common.cancel') }}</button>
      <button class="btn btn-confirm" @click="confirmSelection">{{ t('common.confirm') }}</button>
    </div>
  </div>
</template>

<style scoped>
.icon-picker {
  width: 350px;
  padding: 20px;
  background: var(--card-bg);
  color: var(--text-primary);
  border-radius: 12px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.12);
}

.preview-section {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.preview-label {
  font-size: 14px;
  color: var(--text-secondary);
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
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-secondary);
}

.tab-bar {
  display: flex;
  margin-bottom: 16px;
  border-radius: 8px;
  background: var(--bg-secondary);
  padding: 3px;
}

.tab-btn {
  flex: 1;
  padding: 8px 0;
  border: none;
  background: transparent;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.tab-btn.active {
  background: var(--card-bg);
  color: var(--text-primary);
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
  background: var(--bg-secondary);
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.emoji-item:hover {
  background: var(--btn-secondary-bg);
}

.emoji-item.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.initial-tab {
  margin-bottom: 16px;
}

.color-label {
  font-size: 13px;
  color: var(--text-secondary);
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
  border-color: var(--text-primary);
  transform: scale(1.1);
}

.preset-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.preset-item {
  width: 44px;
  height: 44px;
  padding: 8px;
  border: 2px solid transparent;
  border-radius: 10px;
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s;
}

.preset-item:hover {
  background: var(--btn-secondary-bg);
}

.preset-item.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}

.preset-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
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
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--card-bg);
  color: var(--text-primary);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.15s;
}

.upload-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.image-error {
  color: var(--progress-red);
  font-size: 12px;
}

.preview-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.image-hint {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
}

.actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
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
  color: var(--text-secondary);
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-confirm {
  border: none;
  background: var(--accent);
  color: #fff;
}

.btn-confirm:hover {
  background: var(--accent-hover);
}
</style>
