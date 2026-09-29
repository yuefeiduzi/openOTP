import { ref } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { AppSettings } from '@/types'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    biometricEnabled: true,
    autoCopy: true,
    lockTimeout: 1,
    passwordHint: '',
    language: 'zh-CN',
    theme: 'auto',
    menuBarOnly: false
  })

  const isSetup = ref(false)
  const hasPassword = ref(false)
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

  function completeSetup(withPassword: boolean = true) {
    isSetup.value = true
    hasPassword.value = withPassword
    isLocked.value = false
  }

  async function savePassword(password: string): Promise<void> {
    const hash: string = await invoke('hash_password_cmd', { password })
    await invoke('save_password_hash', { hash })
    hasPassword.value = true
  }

  async function verifyPassword(password: string): Promise<boolean> {
    const hash: string | null = await invoke('load_password_hash')
    if (!hash) return false
    return await invoke('verify_password_cmd', { password, hash })
  }

  async function checkSetup(): Promise<void> {
    const result = await invoke<{ is_setup: boolean; has_password: boolean }>('has_setup')
    isSetup.value = result.is_setup
    hasPassword.value = result.has_password
  }

  async function loadSettings(): Promise<void> {
    try {
      const saved = await invoke('get_settings') as AppSettings | null
      if (saved) {
        Object.assign(settings.value, saved)
      }
    } catch {
      // use defaults
    }
  }

  async function saveSettings(): Promise<void> {
    await invoke('save_settings', { settings: settings.value })
  }

  return {
    settings,
    isSetup,
    hasPassword,
    isLocked,
    updateSettings,
    unlock,
    lock,
    completeSetup,
    savePassword,
    verifyPassword,
    checkSetup,
    loadSettings,
    saveSettings
  }
})