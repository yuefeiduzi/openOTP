import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ show: vi.fn() }),
}))

import App from './App.vue'
import i18n from '@/locales'
import { useSettingsStore, useAccountStore } from '@/stores'

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

async function mountApp() {
  const wrapper = mount(App, {
    global: { stubs: { RouterView: true, GlobalToast: true } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  setHidden(false)
})

describe('App language', () => {
  it('should follow the saved language, including a later change', async () => {
    const settings = useSettingsStore()
    settings.updateSettings({ language: 'zh-CN' })

    await mountApp()
    expect(i18n.global.locale.value).toBe('zh-CN')

    // Reloading the settings (the Rust broadcast does the same) has to switch
    // the strings, or the popover and tray menu keep the language they were
    // created in.
    settings.updateSettings({ language: 'en-US' })
    await flushPromises()

    expect(i18n.global.locale.value).toBe('en-US')
  })
})

describe('App auto lock', () => {
  it('should lock once the hidden time exceeds the timeout', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.updateSettings({ lockTimeout: 1 })

    await mountApp()
    setHidden(true)
    vi.advanceTimersByTime(61_000)
    setHidden(false)
    await flushPromises()

    expect(settings.isLocked).toBe(true)
  })

  it('should not lock while inside the timeout', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.updateSettings({ lockTimeout: 5 })

    await mountApp()
    setHidden(true)
    vi.advanceTimersByTime(60_000)
    setHidden(false)
    await flushPromises()

    expect(settings.isLocked).toBe(false)
  })

  it('should lock immediately when the timeout is zero', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.updateSettings({ lockTimeout: 0 })

    await mountApp()
    setHidden(true)
    setHidden(false)
    await flushPromises()

    expect(settings.isLocked).toBe(true)
  })

  it('should not lock before setup is finished', async () => {
    const settings = useSettingsStore()
    settings.updateSettings({ lockTimeout: 0 })
    expect(settings.isSetup).toBe(false)

    await mountApp()
    setHidden(true)
    vi.advanceTimersByTime(120_000)
    setHidden(false)
    await flushPromises()

    expect(settings.isLocked).toBe(true) // still the initial locked state
  })

  it('should reload accounts when the window becomes visible again', async () => {
    const settings = useSettingsStore()
    const accounts = useAccountStore()
    settings.completeSetup(true)
    const loadSpy = vi.spyOn(accounts, 'loadAccounts')

    await mountApp()
    setHidden(true)
    setHidden(false)
    await flushPromises()

    expect(loadSpy).toHaveBeenCalled()
  })
})