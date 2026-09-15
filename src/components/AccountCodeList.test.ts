import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@/utils/otp', () => ({
  generateTOTP: vi.fn().mockResolvedValue('123456'),
  getTOTPRemainingSeconds: vi.fn().mockReturnValue(20),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ show: vi.fn() }),
}))

import AccountCodeList from './AccountCodeList.vue'
import { useAccountStore, useSettingsStore } from '@/stores'

const writeText = vi.fn().mockResolvedValue(undefined)

function makeAccount(): Account {
  return {
    id: 'a1',
    name: 'alice@example.com',
    issuer: 'GitHub',
    icon: { type: 'initial', value: 'A', bgColor: '#123456' },
    type: 'totp',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'sha1',
    digits: 6,
    period: 30,
    counter: 0,
    notes: '',
    createdAt: 1700000000000,
    order: 0,
  }
}

async function mountList(autoCopy: boolean, clipboardClearTime = 30) {
  const accounts = useAccountStore()
  const settings = useSettingsStore()
  accounts.accounts = [makeAccount()]
  settings.updateSettings({ autoCopy, clipboardClearTime })

  const wrapper = mount(AccountCodeList)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  setActivePinia(createPinia())
  vi.useFakeTimers({ shouldAdvanceTime: true })
  writeText.mockClear()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AccountCodeList copy behaviour', () => {
  it('should copy on tapping the card and hide the copy button by default', async () => {
    const wrapper = await mountList(true)
    await flushPromises()

    expect(wrapper.find('.copy-btn').exists()).toBe(false)

    await wrapper.find('.code-area').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('123456')
  })

  it('should not copy on tapping the card when auto-copy is off', async () => {
    const wrapper = await mountList(false)
    await flushPromises()

    expect(wrapper.find('.copy-btn').exists()).toBe(true)

    await wrapper.find('.code-area').trigger('click')
    await flushPromises()

    expect(writeText).not.toHaveBeenCalled()
  })

  it('should copy from the button when auto-copy is off', async () => {
    const wrapper = await mountList(false)
    await flushPromises()

    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith('123456')
  })

  it('should wipe the clipboard after the configured delay', async () => {
    const wrapper = await mountList(true, 30)
    await flushPromises()

    await wrapper.find('.code-area').trigger('click')
    await flushPromises()

    vi.advanceTimersByTime(30_000)
    await flushPromises()

    expect(writeText).toHaveBeenLastCalledWith('')
  })

  it('should leave the clipboard alone when the delay is never', async () => {
    const wrapper = await mountList(true, 0)
    await flushPromises()

    await wrapper.find('.code-area').trigger('click')
    await flushPromises()

    vi.advanceTimersByTime(300_000)
    await flushPromises()

    expect(writeText).not.toHaveBeenCalledWith('')
  })
})