<script setup lang="ts">
import { ref, computed } from 'vue'
import { COMMON_EMOJIS } from '@/utils/emojis'

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const search = ref('')

const filteredEmojis = computed(() => {
  if (!search.value.trim()) return COMMON_EMOJIS
  return COMMON_EMOJIS.filter(e => e.includes(search.value))
})

const categories = computed(() => {
  const cats: { name: string; emojis: string[] }[] = []
  const groups: Record<string, string[]> = {
    '安全': COMMON_EMOJIS.slice(0, 4),
    '设备': COMMON_EMOJIS.slice(4, 8),
    '通讯': COMMON_EMOJIS.slice(8, 13),
    '网络': COMMON_EMOJIS.slice(13, 17),
    '金融': COMMON_EMOJIS.slice(17, 21),
    '场所': COMMON_EMOJIS.slice(21, 24),
    '娱乐': COMMON_EMOJIS.slice(24, 28),
    '办公': COMMON_EMOJIS.slice(28, 32),
    '工具': COMMON_EMOJIS.slice(32, 36),
    '出行': COMMON_EMOJIS.slice(36, 40),
    '动物': COMMON_EMOJIS.slice(40, 44),
    '自然': COMMON_EMOJIS.slice(44, 48),
    '爱心': COMMON_EMOJIS.slice(48, 52),
    '徽章': COMMON_EMOJIS.slice(52, 56),
    '饮食': COMMON_EMOJIS.slice(56, 60),
    '饮品': COMMON_EMOJIS.slice(60, 64),
    '色块': COMMON_EMOJIS.slice(64, 68),
    '人物': COMMON_EMOJIS.slice(68, 72),
    '旗帜': COMMON_EMOJIS.slice(72, 76),
  }
  for (const [name, emojis] of Object.entries(groups)) {
    if (emojis.length > 0) cats.push({ name, emojis })
  }
  return cats
})

function selectEmoji(emoji: string) {
  emit('update:modelValue', emoji)
}
</script>

<template>
  <div class="emoji-picker">
    <input
      v-model="search"
      type="text"
      class="emoji-search"
      placeholder="搜索 emoji..."
    />

    <div class="emoji-grid">
      <template v-if="search.trim()">
        <button
          v-for="emoji in filteredEmojis"
          :key="emoji"
          class="emoji-item"
          :class="{ selected: modelValue === emoji }"
          @click="selectEmoji(emoji)"
        >
          {{ emoji }}
        </button>
        <p v-if="filteredEmojis.length === 0" class="emoji-empty">
          未找到匹配的 emoji
        </p>
      </template>

      <template v-else>
        <div v-for="cat in categories" :key="cat.name" class="emoji-category">
          <div class="emoji-cat-label">{{ cat.name }}</div>
          <div class="emoji-cat-row">
            <button
              v-for="emoji in cat.emojis"
              :key="emoji"
              class="emoji-item"
              :class="{ selected: modelValue === emoji }"
              @click="selectEmoji(emoji)"
            >
              {{ emoji }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.emoji-picker {
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  overflow: hidden;
}

.emoji-search {
  width: 100%;
  padding: 10px 12px;
  border: none;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;
  background: #fafafa;
}

.emoji-grid {
  max-height: 240px;
  overflow-y: auto;
  padding: 8px;
}

.emoji-category {
  margin-bottom: 8px;
}

.emoji-cat-label {
  font-size: 11px;
  color: #999;
  padding: 4px 4px 2px;
}

.emoji-cat-row {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.emoji-item {
  width: 36px;
  height: 36px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, border-color 0.1s;
  padding: 0;
}

.emoji-item:hover {
  background: #f0f0f0;
}

.emoji-item.selected {
  border-color: #4a90d9;
  background: #eef4ff;
}

.emoji-empty {
  text-align: center;
  color: #999;
  font-size: 13px;
  padding: 16px;
}
</style>
