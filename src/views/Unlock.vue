<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'
import PinInput from '@/components/PinInput.vue'
import { popoverPin } from '@/utils/popoverPin'
import { isPopoverWindow } from '@/utils/windowMode'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const { t } = useI18n()

const password = ref('')
const error = ref('')
const errorNonce = ref(0)
const biometricType = ref('')
const canUseBiometric = ref(false)
const biometricError = ref('')

watch([error, biometricError], () => {
  errorNonce.value++
})

/**
 * The popover hides itself 200 ms after it loses key status. Losing focus while
 * the unlock screen is up (app deactivated, system prompt) used to close the
 * panel the user was typing into, so the unlock screen pins it for as long as it
 * is mounted. The main window has no such handler and stays unpinned.
 */
const inPopover = isPopoverWindow()

onMounted(() => {
  if (inPopover) void popoverPin.pin('unlock')
})

onUnmounted(() => {
  if (inPopover) void popoverPin.unpin('unlock')
})

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
  if (password.value.length !== 6) return

  try {
    const valid = await settingsStore.verifyPassword(password.value)
    if (valid) {
      settingsStore.unlock()
      router.replace(afterUnlockTarget())
    } else {
      error.value = t('errors.passwordError')
      password.value = ''
    }
  } catch {
    error.value = t('errors.verifyFailed')
  }
}

/** Where to go once unlocked: back to whatever the guard interrupted. */
function afterUnlockTarget(): string {
  const redirect = route.query.redirect
  return typeof redirect === 'string' && redirect.startsWith('/') ? redirect : '/'
}

async function useBiometric() {
  biometricError.value = ''
  // The system prompt takes focus away from the popover window, which hides
  // itself on focus loss; pin it for the duration so the prompt is not left
  // floating over a closed panel.
  await popoverPin.pin('biometric')
  try {
    const success = await invoke<boolean>('biometric_auth', { reason: t('biometric.unlock') })
    if (success) {
      await invoke('reset_biometric_failures')
      settingsStore.unlock()
      router.replace(afterUnlockTarget())
      // The system prompt takes activation away from the app, and the window can
      // be left behind whatever the user was looking at — which reads as the app
      // having disappeared. The popover is left alone here: focusing it would
      // bring the main window back with it in menu bar mode.
      if (!inPopover) await invoke('show_main_window').catch(() => {})
    }
  } catch (e) {
    const err = e as { type: string }
    if (err.type === 'LockedOut') {
      canUseBiometric.value = false
      biometricError.value = t('errors.biometricLocked')
    } else if (err.type === 'UserCancelled') {
    } else {
      biometricError.value = t('errors.verifyFailed')
    }
  } finally {
    await popoverPin.unpin('biometric')
  }
}
</script>

<template>
  <div class="unlock">
    <h1>{{ t('unlock.title') }}</h1>
    <p class="subtitle">{{ t('unlock.enterPassword') }}</p>

    <PinInput v-model="password" @complete="handleSubmit" />

    <p v-if="error" :key="errorNonce" class="error">{{ error }}</p>

    <button class="submit-btn" @click="handleSubmit">{{ t('unlock.unlock') }}</button>

    <button
      v-if="settingsStore.settings.biometricEnabled && canUseBiometric"
      class="biometric-btn"
      @click="useBiometric"
    >
      {{ t('unlock.useBiometric', { biometric: biometricLabel }) }}
    </button>

    <p v-if="biometricError" :key="errorNonce" class="biometric-error">{{ biometricError }}</p>

    <p v-if="settingsStore.settings.passwordHint" class="hint">
      {{ t('unlock.hint', { hint: settingsStore.settings.passwordHint }) }}
    </p>
  </div>
</template>

<style scoped>
.unlock {
  padding: 48px 24px;
  text-align: center;
  background: var(--bg-primary);
}

h1 {
  font-size: 28px;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.subtitle {
  color: var(--text-secondary);
  margin-bottom: 32px;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.error {
  color: var(--progress-red);
  font-size: 14px;
  margin: 12px 0 0;
  animation: shake 0.3s ease;
}

.submit-btn {
  width: 100%;
  padding: 12px;
  margin-top: 24px;
  border: none;
  border-radius: 10px;
  background: var(--accent);
  color: white;
  font-size: 16px;
  cursor: pointer;
}

.biometric-btn {
  width: 100%;
  padding: 12px;
  margin-top: 12px;
  border: 1px solid var(--accent);
  border-radius: 10px;
  background: var(--card-bg);
  color: var(--accent);
  font-size: 16px;
  cursor: pointer;
}

.biometric-error {
  color: var(--progress-red);
  font-size: 14px;
  margin-top: 12px;
  animation: shake 0.3s ease;
}

.hint {
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 12px;
}
</style>
