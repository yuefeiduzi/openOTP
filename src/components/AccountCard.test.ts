import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
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

import AccountCard from './AccountCard.vue'

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

async function mountCard(copyOnTap = true, readOnly = false) {
  const wrapper = mount(AccountCard, {
    props: { account: makeAccount(), copyOnTap, readOnly },
  })
  await flushPromises()
  return wrapper
}

/** Presses and holds long enough for the delete gesture to fire. */
async function longPress(wrapper: ReturnType<typeof mount>) {
  await wrapper.find('.account-card').trigger('mousedown')
  vi.advanceTimersByTime(600)
  await flushPromises()
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AccountCard long press', () => {
  it('should emit delete after holding', async () => {
    const wrapper = await mountCard()

    await longPress(wrapper)

    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('should not fire before the hold threshold', async () => {
    const wrapper = await mountCard()

    await wrapper.find('.account-card').trigger('mousedown')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(wrapper.emitted('delete')).toBeUndefined()
  })

  it('should return to rest when the press is released', async () => {
    const wrapper = await mountCard()

    await longPress(wrapper)
    // The scaled state appears once the delete gesture fires …
    expect(wrapper.find('.account-card').classes()).toContain('pressing')

    await wrapper.find('.account-card').trigger('mouseup')
    // … and must not stick to the card afterwards.
    expect(wrapper.find('.account-card').classes()).not.toContain('pressing')
  })

  it('should return to rest when the pointer leaves the card', async () => {
    const wrapper = await mountCard()

    await longPress(wrapper)
    await wrapper.find('.account-card').trigger('mouseleave')

    expect(wrapper.find('.account-card').classes()).not.toContain('pressing')
  })

  it('should not copy when the release follows a long press', async () => {
    const wrapper = await mountCard()

    await longPress(wrapper)
    await wrapper.find('.code-area').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('copy')).toBeUndefined()
  })

  it('should still copy on an ordinary tap after a long press happened', async () => {
    const wrapper = await mountCard()

    await longPress(wrapper)
    await wrapper.find('.code-area').trigger('click')

    await wrapper.find('.account-card').trigger('mousedown')
    await wrapper.find('.code-area').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('copy')).toHaveLength(1)
  })

  it('should not open the editor when the release follows a long press', async () => {
    const wrapper = await mountCard()

    await longPress(wrapper)
    await wrapper.find('.icon-area').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('edit')).toBeUndefined()
  })

  it('should open the editor on an ordinary tap of the icon', async () => {
    const wrapper = await mountCard()

    await wrapper.find('.icon-area').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('edit')).toHaveLength(1)
  })

  it('should ignore the icon tap and the long press when read-only', async () => {
    // 托盘弹窗是只读的：看码、复制码，改图标与删除只能在 App 模式里做
    const wrapper = await mountCard(true, true)

    await wrapper.find('.icon-area').trigger('click')
    await longPress(wrapper)
    await flushPromises()

    expect(wrapper.emitted('edit')).toBeUndefined()
    expect(wrapper.emitted('delete')).toBeUndefined()
  })

  it('should still copy when read-only', async () => {
    const wrapper = await mountCard(true, true)

    await wrapper.find('.copy-btn').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('copy')).toHaveLength(1)
  })
})