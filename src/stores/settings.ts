import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { AppSettings } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    biometricEnabled: true,
    autoCopy: true,
    clipboardClearTime: 30,
    lockTimeout: 1,
    passwordHint: ''
  })

  const isSetup = ref(false)
  const isLocked = ref(true)

  function updateSettings(updates: Partial<AppSettings>) {
    Object.assign(settings.value, updates)
  }

  function unlock() {
    isLocked.value = false
  }

  function lock() {
    isLocked.value = true
  }

  function completeSetup() {
    isSetup.value = true
    isLocked.value = false
  }

  return {
    settings,
    isSetup,
    isLocked,
    updateSettings,
    unlock,
    lock,
    completeSetup
  }
})