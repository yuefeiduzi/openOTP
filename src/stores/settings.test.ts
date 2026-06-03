import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useSettingsStore } from './settings'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

import { invoke } from '@tauri-apps/api/core'

beforeEach(() => {
  vi.clearAllMocks()
  setActivePinia(createPinia())
})

describe('settings store', () => {
  describe('saveSettings', () => {
    it('should include language field when saving settings', async () => {
      const store = useSettingsStore()
      store.updateSettings({ language: 'en-US' })

      await store.saveSettings()

      const callArgs = vi.mocked(invoke).mock.calls[0]
      expect(callArgs[0]).toBe('save_settings')
      expect(callArgs[1]).toEqual({
        settings: expect.objectContaining({
          language: 'en-US',
        }),
      })
    })

    it('should save all settings fields including language', async () => {
      const store = useSettingsStore()
      store.updateSettings({
        biometricEnabled: true,
        autoCopy: false,
        clipboardClearTime: 60,
        lockTimeout: 5,
        passwordHint: 'test hint',
        language: 'zh-CN',
      })

      await store.saveSettings()

      const callArgs = vi.mocked(invoke).mock.calls[0]
      expect(callArgs[1]).toEqual({
        settings: {
          biometricEnabled: true,
          autoCopy: false,
          clipboardClearTime: 60,
          lockTimeout: 5,
          passwordHint: 'test hint',
          language: 'zh-CN',
          theme: 'auto',
        },
      })
    })

    it('should send full settings object not partial fields', async () => {
      const store = useSettingsStore()

      await store.saveSettings()

      const callArgs = vi.mocked(invoke).mock.calls[0]
      const settings = (callArgs[1] as { settings: Record<string, unknown> }).settings

      expect(Object.keys(settings)).toContain('language')
      expect(Object.keys(settings)).toContain('biometricEnabled')
      expect(Object.keys(settings)).toContain('autoCopy')
      expect(Object.keys(settings)).toContain('clipboardClearTime')
      expect(Object.keys(settings)).toContain('lockTimeout')
      expect(Object.keys(settings)).toContain('passwordHint')
      expect(Object.keys(settings)).toContain('theme')
      expect(Object.keys(settings)).toHaveLength(7)
    })

    it('should default language to auto', async () => {
      const store = useSettingsStore()

      await store.saveSettings()

      const callArgs = vi.mocked(invoke).mock.calls[0]
      const settings = (callArgs[1] as { settings: Record<string, unknown> }).settings
      expect(settings.language).toBe('auto')
    })
  })

  describe('updateSettings', () => {
    it('should merge partial settings into existing settings', () => {
      const store = useSettingsStore()
      store.updateSettings({ autoCopy: false, language: 'zh-CN' })

      expect(store.settings.autoCopy).toBe(false)
      expect(store.settings.language).toBe('zh-CN')
      expect(store.settings.biometricEnabled).toBe(true)
    })
  })
})
