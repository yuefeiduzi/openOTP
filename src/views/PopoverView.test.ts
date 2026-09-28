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

  it('should not let a card open the editor', async () => {
    // 弹窗只做「看码 + 复制码」：点图标不再打开改图标的面板
    const store = useAccountStore()
    store.accounts = [makeAccount()]

    const wrapper = mount(PopoverView)
    await wrapper.find('.icon-area').trigger('click')

    expect(wrapper.findComponent({ name: 'EditAccount' }).exists()).toBe(false)
  })

  it('should not let a long press delete an account', async () => {
    vi.useFakeTimers()
    const store = useAccountStore()
    store.accounts = [makeAccount()]
    const removeSpy = vi.spyOn(store, 'removeAccount')

    const wrapper = mount(PopoverView)
    await wrapper.find('.account-card').trigger('mousedown')
    vi.advanceTimersByTime(600)
    await wrapper.vm.$nextTick()

    expect(wrapper.findComponent({ name: 'DeleteConfirm' }).exists()).toBe(false)
    expect(removeSpy).not.toHaveBeenCalled()
  })

  it('should still copy a code', async () => {
    const store = useAccountStore()
    store.accounts = [makeAccount()]

    const wrapper = mount(PopoverView)

    expect(wrapper.find('.copy-btn').exists()).toBe(true)
  })

  it('should list the accounts held in the store', () => {
    const store = useAccountStore()
    store.accounts = [makeAccount()]

    const wrapper = mount(PopoverView)

    expect(wrapper.findAll('.account-card')).toHaveLength(1)
  })

})
