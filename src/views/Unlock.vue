<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'

const router = useRouter()
const settingsStore = useSettingsStore()
const { t } = useI18n()

const password = ref('')
const error = ref('')
const biometricType = ref('')
const canUseBiometric = ref(false)
const biometricError = ref('')

const biometricLabel = computed(() => {
  const labels: Record<string, string> = {
    touchid: t('biometric.touchid'),
    faceid: t('biometric.faceid'),
    fingerprint: t('biometric.fingerprint'),
    face: t('biometric.face')
  }
  return labels[biometricType.value] || t('biometric.default')
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
    error.value = t('errors.enterPassword')
    return
  }

  try {
    const valid = await settingsStore.verifyPassword(password.value)
    if (valid) {
      settingsStore.unlock()
      router.replace('/')
    } else {
      error.value = t('errors.passwordError')
    }
  } catch {
    error.value = t('errors.verifyFailed')
  }
}

async function useBiometric() {
  biometricError.value = ''
  try {
    const success = await invoke<boolean>('biometric_auth', { reason: t('biometric.unlock') })
    if (success) {
      await invoke('reset_biometric_failures')
      settingsStore.unlock()
      router.replace('/')
    }
  } catch (e) {
    const err = e as { type: string }
    if (err.type === 'LockedOut') {
      canUseBiometric.value = false
      biometricError.value = t('errors.biometricLocked')
    } else if (err.type === 'UserCancelled') {
    } else if (err.type === 'Failed') {
      biometricError.value = t('errors.verifyFailed')
    } else {
      biometricError.value = t('errors.verifyFailed')
    }
  }
}
</script>

<template>
  <div class="unlock">
    <h1>{{ t('unlock.title') }}</h1>
    <p class="subtitle">{{ t('unlock.enterPassword') }}</p>

    <form @submit.prevent="handleSubmit">
      <div class="form-group">
        <input 
          v-model="password"
          type="password"
          maxlength="6"
          :placeholder="t('unlock.passwordPlaceholder')"
          autofocus
        />
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="submit-btn">{{ t('unlock.unlock') }}</button>
    </form>

    <button 
      v-if="settingsStore.settings.biometricEnabled && canUseBiometric"
      class="biometric-btn"
      @click="useBiometric"
    >
      {{ t('unlock.useBiometric', { biometric: biometricLabel }) }}
    </button>

    <p v-if="biometricError" class="biometric-error">{{ biometricError }}</p>

    <p v-if="settingsStore.settings.passwordHint" class="hint">
      {{ t('unlock.hint', { hint: settingsStore.settings.passwordHint }) }}
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
