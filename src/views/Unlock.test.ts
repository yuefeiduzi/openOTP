import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

const replace = vi.fn()
vi.mock('vue-router', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useRoute: () => ({ query: routeQuery }),
}))

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

let routeQuery: Record<string, string> = {}

import Unlock from './Unlock.vue'
import { useSettingsStore } from '@/stores'

type UnlockWrapper = Awaited<ReturnType<typeof mountUnlock>>

async function mountUnlock() {
  const settings = useSettingsStore()
  settings.completeSetup(true)
  settings.lock()

  const wrapper = mount(Unlock)
  await flushPromises()
  return wrapper
}

async function enterPin(wrapper: UnlockWrapper) {
  const boxes = wrapper.findAll('input')
  for (const [index, box] of boxes.entries()) {
    await box.setValue(String((index + 1) % 10))
  }
  await wrapper.find('.submit-btn').trigger('click')
  await flushPromises()
}

beforeEach(() => {
  routeQuery = {}
  replace.mockClear()
  setActivePinia(createPinia())
  invokeMock.mockImplementation((command: string) => {
    if (command === 'has_setup') return Promise.resolve({ is_setup: true, has_password: true })
    if (command === 'load_password_hash') return Promise.resolve('pbkdf2_sha256:100000:aa:bb')
    if (command === 'verify_password_cmd') return Promise.resolve(true)
    if (command === 'check_biometric') return Promise.resolve(false)
    return Promise.resolve(undefined)
  })
})

describe('Unlock', () => {
  it('should go home after a correct password', async () => {
    const wrapper = await mountUnlock()

    await enterPin(wrapper)

    expect(replace).toHaveBeenCalledWith('/')
  })

  it('should return to the interrupted destination when one was recorded', async () => {
    routeQuery = { redirect: '/popover' }
    const wrapper = await mountUnlock()

    await enterPin(wrapper)

    expect(replace).toHaveBeenCalledWith('/popover')
  })

  it('should ignore a redirect that does not start at the root', async () => {
    routeQuery = { redirect: 'https://example.com' }
    const wrapper = await mountUnlock()

    await enterPin(wrapper)

    expect(replace).toHaveBeenCalledWith('/')
  })

  it('should stay locked and clear the input after a wrong password', async () => {
    const settings = useSettingsStore()
    invokeMock.mockImplementation((command: string) => {
      if (command === 'has_setup') return Promise.resolve({ is_setup: true, has_password: true })
      if (command === 'load_password_hash') return Promise.resolve('pbkdf2_sha256:100000:aa:bb')
      if (command === 'verify_password_cmd') return Promise.resolve(false)
      return Promise.resolve(undefined)
    })

    const wrapper = await mountUnlock()
    await enterPin(wrapper)

    expect(replace).not.toHaveBeenCalled()
    expect(settings.isLocked).toBe(true)
    expect(wrapper.find('.error').exists()).toBe(true)
  })

  it('should pin the popover while the biometric prompt is up', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'has_setup') return Promise.resolve({ is_setup: true, has_password: true })
      if (command === 'check_biometric') return Promise.resolve(true)
      if (command === 'get_biometric_type') return Promise.resolve('touchid')
      if (command === 'get_biometric_status') {
        return Promise.resolve({ failure_count: 0, can_use_biometric: true })
      }
      if (command === 'biometric_auth') return Promise.resolve(true)
      return Promise.resolve(undefined)
    })

    const settings = useSettingsStore()
    settings.updateSettings({ biometricEnabled: true })

    const wrapper = await mountUnlock()
    await wrapper.find('.biometric-btn').trigger('click')
    await flushPromises()

    const pinCalls = invokeMock.mock.calls.filter(call => call[0] === 'set_popover_pinned')
    expect(pinCalls[0][1]).toEqual({ pinned: true })
    expect(pinCalls[pinCalls.length - 1][1]).toEqual({ pinned: false })
  })
})