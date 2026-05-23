<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'

const router = useRouter()
const settingsStore = useSettingsStore()

const password = ref('')
const confirmPassword = ref('')
const passwordHint = ref('')
const enableBiometric = ref(true)
const error = ref('')

const biometricType = ref('')
const biometricAvailable = ref(false)

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
  try {
    biometricAvailable.value = await invoke<boolean>('check_biometric')
    if (biometricAvailable.value) {
      biometricType.value = await invoke<string>('get_biometric_type')
    }
  } catch {
    biometricAvailable.value = false
    enableBiometric.value = false
  }
})

async function handleSubmit() {
  if (password.value.length !== 6) {
    error.value = '密码必须是6位数字'
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = '两次密码不一致'
    return
  }

  try {
    if (enableBiometric.value && biometricAvailable.value) {
      const success = await invoke<boolean>('biometric_auth', { reason: '设置主密码' })
      if (!success) {
        error.value = '生物识别验证失败'
        return
      }
    }

    settingsStore.updateSettings({
      passwordHint: passwordHint.value,
      biometricEnabled: enableBiometric.value
    })
    await settingsStore.savePassword(password.value)
    await settingsStore.saveSettings()
    settingsStore.completeSetup()
    router.replace('/')
  } catch (e) {
    const err = e as { type: string }
    if (err.type === 'UserCancelled') {
      error.value = '请完成生物识别验证'
    } else if (err.type) {
      error.value = '生物识别验证失败'
    } else {
      error.value = '设置失败，请重试'
    }
  }
}
</script>

<template>
  <div class="setup">
    <h1>欢迎使用 openOTP</h1>
    <p class="subtitle">请设置6位数字主密码</p>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <label>主密码</label>
        <input 
          v-model="password"
          type="password"
          maxlength="6"
          placeholder="请输入6位数字"
        />
      </div>

      <div class="form-group">
        <label>确认密码</label>
        <input 
          v-model="confirmPassword"
          type="password"
          maxlength="6"
          placeholder="请再次输入"
        />
      </div>

      <div class="form-group">
        <label>密码提示（可选）</label>
        <input 
          v-model="passwordHint"
          type="text"
          maxlength="50"
          placeholder="最多50字符"
        />
      </div>

      <div v-if="biometricAvailable" class="form-group checkbox">
        <label>
          <input v-model="enableBiometric" type="checkbox" />
          启用{{ biometricLabel }}解锁
        </label>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="submit-btn">完成设置</button>
    </form>
  </div>
</template>

<style scoped>
.setup {
  padding: 24px;
}

h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  margin-bottom: 32px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  box-sizing: border-box;
}

.checkbox label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox input {
  width: auto;
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
</style>
