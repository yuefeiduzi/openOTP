import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

// Keep the real helpers and stub only what talks to the clock.
vi.mock('@/utils/otp', async importOriginal => ({
  ...(await importOriginal<typeof import('@/utils/otp')>()),
  generateTOTP: vi.fn().mockResolvedValue('123456'),
  getTOTPRemainingSeconds: vi.fn().mockReturnValue(20),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ show: vi.fn() }),
}))

import AccountCodeList from './AccountCodeList.vue'
import { useAccountStore, useSettingsStore } from '@/stores'

const writeText = vi.fn().mockResolvedValue(undefined)

function makeAccount(overrides: Partial<Account> = {}): Account {
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
    ...overrides,
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
describe('AccountCodeList drag reorder', () => {
  async function mountThree() {
    const accounts = useAccountStore()
    const settings = useSettingsStore()
    settings.updateSettings({ autoCopy: true })
    accounts.accounts = [
      makeAccount({ id: 'a', order: 0, name: 'first' }),
      makeAccount({ id: 'b', order: 1, name: 'second', issuer: 'Other' }),
      makeAccount({ id: 'c', order: 2, name: 'third', issuer: 'Third' }),
    ]
    const wrapper = mount(AccountCodeList)
    await flushPromises()
    return wrapper
  }

  function dragData() {
    return { effectAllowed: '', dropEffect: '', setData: vi.fn() } as unknown as DataTransfer
  }

  it('should move a card to the end when dropped on the lower half of the last card', async () => {
    const wrapper = await mountThree()
    const store = useAccountStore()
    const spy = vi.spyOn(store, 'reorderAccounts')

    const cards = wrapper.findAll('.account-card')
    await cards[0].trigger('dragstart', { dataTransfer: dragData() })
    // jsdom/happy-dom have no layout, so the pointer is treated as the top half
    // unless the element reports a height.
    await cards[2].trigger('dragover', { dataTransfer: dragData(), clientY: 100 })
    await cards[2].trigger('drop', { dataTransfer: dragData() })

    expect(spy).toHaveBeenCalledWith(['b', 'c', 'a'])
  })

  it('should insert before a card when dropped on its upper half', async () => {
    const wrapper = await mountThree()
    const store = useAccountStore()
    const spy = vi.spyOn(store, 'reorderAccounts')

    const cards = wrapper.findAll('.account-card')
    await cards[0].trigger('dragstart', { dataTransfer: dragData() })
    await cards[2].trigger('dragover', { dataTransfer: dragData(), clientY: 0 })
    await cards[2].trigger('drop', { dataTransfer: dragData() })

    expect(spy).toHaveBeenCalledWith(['b', 'a', 'c'])
  })

  it('should not reorder when a card is dropped on itself', async () => {
    const wrapper = await mountThree()
    const store = useAccountStore()
    const spy = vi.spyOn(store, 'reorderAccounts')

    const cards = wrapper.findAll('.account-card')
    await cards[1].trigger('dragstart', { dataTransfer: dragData() })
    await cards[1].trigger('dragover', { dataTransfer: dragData(), clientY: 0 })
    await cards[1].trigger('drop', { dataTransfer: dragData() })

    expect(spy).not.toHaveBeenCalled()
  })
})
