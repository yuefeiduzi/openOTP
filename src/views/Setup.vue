<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'
import PinInput from '@/components/PinInput.vue'

const router = useRouter()
const settingsStore = useSettingsStore()
const { t } = useI18n()

const password = ref('')
const confirmPassword = ref('')
const passwordHint = ref('')
const enableBiometric = ref(true)
const error = ref('')

const biometricType = ref('')
const biometricAvailable = ref(false)

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

async function handleSetupWithPassword() {
  if (password.value.length !== 6) {
    error.value = t('errors.passwordLength')
    return
  }
  if (password.value !== confirmPassword.value) {
    error.value = t('errors.passwordMismatch')
    return
  }

  try {
    if (enableBiometric.value && biometricAvailable.value) {
      const success = await invoke<boolean>('biometric_auth', { reason: t('biometric.setup') })
      if (!success) {
        error.value = t('errors.biometricFailed')
        return
      }
    }

    settingsStore.updateSettings({
      passwordHint: passwordHint.value,
      biometricEnabled: enableBiometric.value
    })
    await settingsStore.savePassword(password.value)
    await settingsStore.saveSettings()
    settingsStore.completeSetup(true)
    router.replace('/')
  } catch (e) {
    const err = e as { type: string }
    if (err.type === 'UserCancelled') {
      error.value = t('errors.biometricRequired')
    } else if (err.type) {
      error.value = t('errors.biometricFailed')
    } else {
      error.value = t('errors.setupFailed')
    }
  }
}

async function handleSkipSetup() {
  settingsStore.updateSettings({
    passwordHint: '',
    biometricEnabled: false
  })
  await settingsStore.saveSettings()
  settingsStore.completeSetup(false)
  router.replace('/')
}
</script>

<template>
  <div class="setup">
    <h1>{{ t('setup.welcome') }}</h1>
    <p class="subtitle">{{ t('setup.setPassword') }}</p>

    <form @submit.prevent="handleSetupWithPassword">
      <div class="form-group">
        <label>{{ t('setup.masterPassword') }}</label>
        <PinInput v-model="password" />
      </div>

      <div class="form-group">
        <label>{{ t('setup.confirmPassword') }}</label>
        <PinInput v-model="confirmPassword" />
      </div>

      <div class="form-group">
        <label>{{ t('setup.passwordHint') }}</label>
        <input
          v-model="passwordHint"
          type="text"
          maxlength="50"
          :placeholder="t('setup.hintPlaceholder')"
        />
      </div>

      <div v-if="biometricAvailable" class="form-group checkbox">
        <label>
          <input v-model="enableBiometric" type="checkbox" />
          {{ t('setup.enableBiometric', { biometric: biometricLabel }) }}
        </label>
      </div>

      <p v-if="error" class="error">{{ error }}</p>

      <button type="submit" class="submit-btn primary">{{ t('setup.setupPassword') }}</button>
    </form>

    <button class="skip-btn" @click="handleSkipSetup">{{ t('setup.skipSetup') }}</button>
  </div>
</template>

<style scoped>
.setup {
  padding: 24px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.subtitle {
  color: #666;
  margin-bottom: 32px;
}

form {
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 10px;
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
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: #4a90d9;
  color: white;
  font-size: 16px;
  cursor: pointer;
  margin-bottom: 12px;
}

.submit-btn:hover {
  background: #3a7bc8;
}

.skip-btn {
  width: 100%;
  padding: 14px;
  border: 1px solid #ddd;
  border-radius: 10px;
  background: white;
  color: #666;
  font-size: 16px;
  cursor: pointer;
}

.skip-btn:hover {
  background: #f5f5f5;
}
</style>
