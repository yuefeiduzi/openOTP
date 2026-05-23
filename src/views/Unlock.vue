<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'

const router = useRouter()
const settingsStore = useSettingsStore()

const password = ref('')
const error = ref('')
const biometricType = ref('')
const canUseBiometric = ref(false)
const biometricError = ref('')

const biometricLabel = computed(() => {
  const labels: Record<string, string> = {
    touchid: 'Touch ID',
    faceid: 'Face ID',
    fingerprint: '指纹',
    face: '面容'
  }
  return labels[biometricType.value] || '生物识别'
})

onMounted(async () => {
  await settingsStore.checkSetup()
  if (!settingsStore.isSetup) {
    router.replace('/setup')
    return
  }

  if (settingsStore.settings.biometricEnabled) {
    try {
      const available = await invoke<boolean>('check_biometric')
      if (available) {
        biometricType.value = await invoke<string>('get_biometric_type')
        const status = await invoke<{ failure_count: number; can_use_biometric: boolean }>('get_biometric_status')
        canUseBiometric.value = status.can_use_biometric
      }
    } catch {
      canUseBiometric.value = false
    }
  }
})

async function handleSubmit() {
  if (password.value.length !== 6) {
    error.value = '请输入6位密码'
    return
  }

  try {
    const valid = await settingsStore.verifyPassword(password.value)
    if (valid) {
      settingsStore.unlock()
      router.replace('/')
    } else {
      error.value = '密码错误'
    }
  } catch {
    error.value = '验证失败，请重试'
  }
}

async function useBiometric() {
  biometricError.value = ''
  try {
    const success = await invoke<boolean>('biometric_auth', { reason: '解锁 openOTP' })
    if (success) {
      await invoke('reset_biometric_failures')
      settingsStore.unlock()
      router.replace('/')
    }
  } catch (e) {
    const err = e as { type: string }
    if (err.type === 'LockedOut') {
      canUseBiometric.value = false
      biometricError.value = '生物识别已锁定，请使用密码解锁'
    } else if (err.type === 'UserCancelled') {
      // 静默处理
    } else if (err.type === 'Failed') {
      biometricError.value = '验证失败，请重试'
    } else {
      biometricError.value = '系统错误，请稍后重试'
    }
  }
}
</script>

<template>
  <div class="unlock">
    <h1>openOTP</h1>
    <p class="subtitle">请输入主密码解锁</p>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <input 
          v-model="password"
          type="password"
          maxlength="6"
          placeholder="请输入6位密码"
          autofocus
        />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="submit-btn">解锁</button>
    </form>

    <button 
      v-if="settingsStore.settings.biometricEnabled && canUseBiometric"
      class="biometric-btn"
      @click="useBiometric"
    >
      使用 {{ biometricLabel }} 解锁
    </button>

    <p v-if="biometricError" class="biometric-error">{{ biometricError }}</p>

    <p v-if="settingsStore.settings.passwordHint" class="hint">
      提示：{{ settingsStore.settings.passwordHint }}
    </p>
  </div>
</template>

<style scoped>
.unlock {
  padding: 48px 24px;
  text-align: center;
}

h1 {
  font-size: 28px;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 20px;
  text-align: center;
  letter-spacing: 8px;
  box-sizing: border-box;
}

.error {
  color: #e74c3c;
  font-size: 14px;
  margin-bottom: 16px;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 8px;
  background: #4a90d9;
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.biometric-btn {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: 1px solid #4a90d9;
  border-radius: 8px;
  background: white;
  color: #4a90d9;
  font-size: 16px;
  cursor: pointer;
}

.biometric-error {
  color: #e74c3c;
  font-size: 14px;
  margin-top: 12px;
}

.hint {
  margin-top: 24px;
  color: #999;
  font-size: 12px;
}
</style>
