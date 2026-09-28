import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

import PopoverView from './PopoverView.vue'
import { useAccountStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'alice@example.com',
    issuer: 'GitHub',
    icon: { type: 'emoji', value: '', bgColor: '' },
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

beforeEach(() => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('PopoverView', () => {
  it('should not offer adding an account', () => {
    // 添加账号要用二维码 / 手动输入，只在 App 模式下做
    const wrapper = mount(PopoverView)

    expect(wrapper.findComponent({ name: 'AddAccount' }).exists()).toBe(false)
    expect(wrapper.find('.empty-add-btn').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'AccountCodeList' }).props('allowAdd')).toBe(false)
  })

  it('should point at app mode when there is nothing to show', () => {
    const wrapper = mount(PopoverView)

    expect(wrapper.text()).toContain('home.addInAppMode')
  })

  it('should pin the popover window while a modal is open', async () => {
    const store = useAccountStore()
    store.accounts = [makeAccount()]

    const wrapper = mount(PopoverView)
    await wrapper.find('.icon-area').trigger('click')
    await wrapper.vm.$nextTick()

    expect(invoke).toHaveBeenCalledWith('set_popover_pinned', { pinned: true })
  })

  it('should list the accounts held in the store', () => {
    const store = useAccountStore()
    store.accounts = [makeAccount()]

    const wrapper = mount(PopoverView)

    expect(wrapper.findAll('.account-card')).toHaveLength(1)
  })

  it('should open the edit modal when a card is clicked', async () => {
    const store = useAccountStore()
    const account = makeAccount()
    store.accounts = [account]

    const wrapper = mount(PopoverView)
    await wrapper.find('.icon-area').trigger('click')

    const editor = wrapper.findComponent({ name: 'EditAccount' })
    expect(editor.props('visible')).toBe(true)
    expect(editor.props('account')).toMatchObject({ id: account.id })
  })

  it('should open the delete confirmation on long press and delete on confirm', async () => {
    vi.useFakeTimers()
    const store = useAccountStore()
    store.accounts = [makeAccount()]
    const removeSpy = vi.spyOn(store, 'removeAccount')

    const wrapper = mount(PopoverView)
    await wrapper.find('.account-card').trigger('mousedown')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'DeleteConfirm' }).props('visible')).toBe(true)

    await wrapper.find('.btn-delete').trigger('click')

    expect(removeSpy).toHaveBeenCalledWith('a1')
  })
})