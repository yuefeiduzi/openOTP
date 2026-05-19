<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import type { Account } from '@/types'
import { generateTOTP, generateHOTP, getTOTPRemainingSeconds } from '@/utils/otp'
import { getInitialStyle } from '@/utils/icons'

const props = defineProps<{
  account: Account
}>()

const emit = defineEmits<{
  copy: [code: string]
  delete: []
  refresh: []
}>()

const currentCode = ref('')
const progress = ref(100)
const isLongPress = ref(false)
let timerInterval: ReturnType<typeof setInterval> | null = null
let pressTimer: ReturnType<typeof setTimeout> | null = null
let pendingRefresh = false

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

async function updateHOTP() {
  try {
    const code = await generateHOTP(
      props.account.secret,
      props.account.counter,
      props.account.algorithm || 'sha1',
      props.account.digits || 6,
    )
    currentCode.value = getCodeSpacing(code)
  } catch {
    currentCode.value = '000 000'
  }
}

function startTimer() {
  if (props.account.type === 'totp') {
    updateTOTP()
    timerInterval = setInterval(updateTOTP, 1000)
  } else {
    updateHOTP()
  }
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function handleCopy() {
  const raw = currentCode.value.replace(/\s/g, '')
  emit('copy', raw)
}

function handleRefresh() {
  pendingRefresh = true
  emit('refresh')
  setTimeout(() => {
    updateHOTP()
    pendingRefresh = false
  }, 100)
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
      <div class="icon-area">
        <span v-if="account.icon.type === 'emoji'" class="icon-emoji">{{ account.icon.value }}</span>
        <div
          v-else-if="account.icon.type === 'initial'"
          :style="getInitialStyle(account.icon)"
          class="icon-initial"
        >
          {{ account.icon.value || (account.name ? account.name.charAt(0).toUpperCase() : '?') }}
        </div>
        <div v-else class="icon-image">
          🔐
        </div>
      </div>

      <div class="code-area" @click.stop="handleCopy">
        <div class="code-text">{{ currentCode }}</div>
        <div class="issuer-name">{{ account.issuer }}</div>
      </div>

      <button class="copy-btn" @click.stop="handleCopy">
        📋
      </button>
    </div>

    <div
      v-if="account.type === 'totp'"
      class="progress-bar"
      :class="{
        'progress-green': progress > 50,
        'progress-yellow': progress > 20 && progress <= 50,
        'progress-red': progress <= 20,
      }"
      :style="{ width: progress + '%' }"
    />

    <button
      v-else
      class="refresh-btn"
      @click.stop="handleRefresh"
      :disabled="pendingRefresh"
    >
      🔄
    </button>
  </div>
</template>

<style scoped>
.account-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
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
}

.icon-emoji {
  font-size: 28px;
  line-height: 1;
}

.icon-initial {
  border-radius: 50%;
}

.icon-image {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #f0f0f0;
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
  color: #222;
  font-variant-numeric: tabular-nums;
}

.issuer-name {
  font-size: 12px;
  color: #999;
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
  background: #f5f5f5;
  border-radius: 8px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s;
}

.copy-btn:hover {
  background: #e8e8e8;
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
  background-color: #4CAF50;
}

.progress-yellow {
  background-color: #FF9800;
}

.progress-red {
  background-color: #F44336;
}

.refresh-btn {
  width: 100%;
  margin-top: 8px;
  padding: 6px 0;
  border: none;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.15s;
}

.refresh-btn:hover:not(:disabled) {
  background: #e8e8e8;
}

.refresh-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
