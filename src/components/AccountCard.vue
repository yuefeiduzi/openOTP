<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { Account } from '@/types'
import { generateTOTP, getTOTPRemainingSeconds } from '@/utils/otp'
import { getInitialStyle } from '@/utils/icons'
import { getPresetIconUrl } from '@/utils/presetIcons'

const props = defineProps<{
  account: Account
}>()

const emit = defineEmits<{
  copy: [code: string]
  delete: []
  edit: []
}>()

const currentCode = ref('')
const progress = ref(100)
const isLongPress = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null
let pressTimer: ReturnType<typeof setTimeout> | null = null

function getCodeSpacing(code: string): string {
  if (code.length <= 6) {
    const half = Math.floor(code.length / 2)
    return code.substring(0, half) + ' ' + code.substring(half)
  }
  if (code.length === 7) {
    return code[0] + ' ' + code.substring(1, 4) + ' ' + code.substring(4)
  }
  return code.substring(0, 3) + ' ' + code.substring(3, 6) + ' ' + code.substring(6)
}

async function updateTOTP() {
  try {
    const code = await generateTOTP(
      props.account.secret,
      props.account.algorithm || 'sha1',
      props.account.digits || 6,
      props.account.period || 30,
    )
    currentCode.value = getCodeSpacing(code)
    const remaining = getTOTPRemainingSeconds(props.account.period || 30)
    const period = props.account.period || 30
    progress.value = (remaining / period) * 100
  } catch {
    currentCode.value = '000 000'
    progress.value = 100
  }
}

function startTimer() {
  updateTOTP()
  timerInterval = setInterval(updateTOTP, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function handleEdit() {
  emit('edit')
}

function handleCopy() {
  const raw = currentCode.value.replace(/\s/g, '')
  emit('copy', raw)
}

function startLongPress() {
  pressTimer = setTimeout(() => {
    isLongPress.value = true
    emit('delete')
    pressTimer = null
  }, 500)
}

function cancelLongPress() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

watch(() => props.account, () => {
  stopTimer()
  startTimer()
})

onMounted(() => {
  startTimer()
})

onUnmounted(() => {
  stopTimer()
  cancelLongPress()
})
</script>

<template>
  <div
    class="account-card"
    :class="{ pressing: isLongPress }"
    @mousedown="startLongPress"
    @mouseup="cancelLongPress"
    @mouseleave="cancelLongPress"
    @touchstart="startLongPress"
    @touchend="cancelLongPress"
    @touchcancel="cancelLongPress"
  >
    <div class="card-content">
      <div class="icon-area" @click.stop="handleEdit">
        <span v-if="account.icon.type === 'emoji'" class="icon-emoji">{{ account.icon.value }}</span>
        <div
          v-else-if="account.icon.type === 'initial'"
          :style="getInitialStyle(account.icon)"
          class="icon-initial"
        >
          {{ account.icon.value || (account.name ? account.name.charAt(0).toUpperCase() : '?') }}
        </div>
        <div v-else-if="account.icon.type === 'preset'" class="icon-image">
          <img :src="getPresetIconUrl(account.icon.value)" alt="" />
        </div>
        <div v-else class="icon-image">
          <img
            v-if="account.icon.value.startsWith('data:')"
            :src="account.icon.value"
            alt=""
          />
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </div>
      </div>

      <div class="code-area" @click.stop="handleCopy">
        <div class="code-text">{{ currentCode }}</div>
        <div class="issuer-name">{{ account.issuer }}</div>
      </div>

      <button class="copy-btn" @click.stop="handleCopy">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
      </button>
    </div>

    <div
      class="progress-bar"
      :class="{
        'progress-green': progress > 50,
        'progress-yellow': progress > 20 && progress <= 50,
        'progress-red': progress <= 20,
      }"
      :style="{ width: progress + '%' }"
    />
  </div>
</template>

<style scoped>
.account-card {
  background: var(--card-bg);
  border-radius: 12px;
  box-shadow: var(--card-shadow);
  padding: 12px;
  margin-bottom: 8px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  user-select: none;
  transition: transform 0.1s;
}

.account-card.pressing {
  transform: scale(0.97);
}

.card-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.icon-area {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.15s;
}

.icon-area:hover {
  background: rgba(0, 0, 0, 0.04);
}

.icon-emoji {
  font-size: 28px;
  line-height: 1;
}

.icon-initial {
  border-radius: 50%;
}

.icon-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 50%;
}

.icon-image {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.code-area {
  flex: 1;
  min-width: 0;
}

.code-text {
  font-size: 22px;
  font-weight: 600;
  letter-spacing: 1px;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.issuer-name {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.copy-btn {
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  border: none;
  background: var(--bg-secondary);
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
  color: var(--text-secondary);
}

.copy-btn:hover {
  background: var(--border-color);
}

.progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 2px;
  border-radius: 0 0 12px 12px;
  transition: width 0.3s linear, background-color 0.3s;
}

.progress-green {
  background-color: var(--progress-green);
}

.progress-yellow {
  background-color: var(--progress-yellow);
}

.progress-red {
  background-color: var(--progress-red);
}
</style>
