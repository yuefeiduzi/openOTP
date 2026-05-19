<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'

const router = useRouter()
const settingsStore = useSettingsStore()

const password = ref('')
const error = ref('')
const biometricFailed = ref(false)

onMounted(async () => {
  await settingsStore.checkSetup()
  if (!settingsStore.isSetup) {
    router.replace('/setup')
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
  try {
    const success = await invoke('biometric_auth', { reason: '解锁 openOTP' })
    if (success) {
      settingsStore.unlock()
      router.replace('/')
    } else {
      biometricFailed.value = true
    }
  } catch {
    biometricFailed.value = true
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
      v-if="settingsStore.settings.biometricEnabled && !biometricFailed"
      class="biometric-btn"
      @click="useBiometric"
    >
      使用生物识别解锁
    </button>

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

.hint {
  margin-top: 24px;
  color: #999;
  font-size: 12px;
}
</style>