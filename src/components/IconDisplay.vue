<script setup lang="ts">
import { computed } from 'vue'
import type { AccountIcon } from '@/types'
import { renderIcon } from '@/utils/icons'
import { getPresetIcon } from '@/utils/presetIcons'

const props = withDefaults(defineProps<{
  icon: AccountIcon | null | undefined
  /** Used for the initial letter when the icon itself has no readable value. */
  name?: string
  /** Box size in pixels for image and placeholder icons. */
  size?: number
}>(), {
  size: 36,
})

const rendered = computed(() => renderIcon(props.icon, props.name))

// Brand marks whose own colour is too dark for the dark theme are drawn as a
// white silhouette there; coloured brands keep their colour.
const isLowContrastPreset = computed(() =>
  props.icon?.type === 'preset'
    ? getPresetIcon(props.icon.value)?.lowContrastInDark ?? false
    : false,
)

const boxStyle = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
}))

const emojiStyle = computed(() => ({
  fontSize: `${Math.round(props.size * 0.78)}px`,
  lineHeight: '1',
}))

// The initial provider supplies its own circle styling.
const textStyle = computed(() => ({
  ...(rendered.value.type === 'text' && rendered.value.style
    ? rendered.value.style
    : emojiStyle.value),
}))
</script>

<template>
  <span v-if="rendered.type === 'text'" class="icon-display-text" :style="textStyle">
    {{ rendered.value }}
  </span>
  <span v-else-if="rendered.type === 'image'" class="icon-display-box" :style="boxStyle">
    <img
      :class="['icon-display-image', { 'icon-display-image--low-contrast': isLowContrastPreset }]"
      :src="rendered.value"
      alt=""
    />
  </span>
  <span v-else class="icon-display-placeholder" :style="boxStyle">
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  </span>
</template>

<style scoped>
.icon-display-text {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 图标底与图形分开：深色主题下要把图形压成纯白剪影，而 CSS filter 会连元素的
   背景一起处理，所以底色留在外层，filter 只作用于图片本身。*/
.icon-display-box {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--icon-tile-bg);
  overflow: hidden;
}

.icon-display-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.icon-display-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--icon-tile-bg);
  color: var(--text-secondary);
}
</style>