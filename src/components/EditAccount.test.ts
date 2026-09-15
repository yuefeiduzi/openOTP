import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import EditAccount from './EditAccount.vue'

const DATA_URL = 'data:image/png;base64,iVBORw0KGgo='

function makeAccount(icon: Account['icon']): Account {
  return {
    id: 'a1',
    name: 'alice@example.com',
    issuer: 'GitHub',
    icon,
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

function mountEditor(account: Account) {
  return mount(EditAccount, { props: { visible: true, account } })
}

function savedPayload(wrapper: ReturnType<typeof mountEditor>): Partial<Account> {
  const events = wrapper.emitted('save') as unknown as [Partial<Account>][]
  return events[0][0]
}

function savedIcon(wrapper: ReturnType<typeof mountEditor>) {
  return savedPayload(wrapper).icon!
}

describe('EditAccount icon handling', () => {
  it('should preserve a preset icon when the icon editor is untouched', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'preset', value: 'github', bgColor: '' }))

    await wrapper.find('.btn-save').trigger('click')

    expect(savedIcon(wrapper)).toEqual({ type: 'preset', value: 'github', bgColor: '' })
  })

  it('should preserve an uploaded image icon when renaming the account', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'image', value: DATA_URL, bgColor: '' }))

    await wrapper.find('input').setValue('renamed@example.com')
    await wrapper.find('.btn-save').trigger('click')

    expect(savedIcon(wrapper)).toEqual({ type: 'image', value: DATA_URL, bgColor: '' })
  })

  it('should not rewrite the icon when only the notes change', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'emoji', value: '🔑', bgColor: '' }))

    await wrapper.find('textarea').setValue('new note')
    await wrapper.find('.btn-save').trigger('click')

    expect(savedIcon(wrapper)).toEqual({ type: 'emoji', value: '🔑', bgColor: '' })
    expect(savedPayload(wrapper).notes).toBe('new note')
  })

  it('should render an uploaded image in the preview', () => {
    const wrapper = mountEditor(makeAccount({ type: 'image', value: DATA_URL, bgColor: '' }))

    expect(wrapper.find('.icon-preview-img').attributes('src')).toBe(DATA_URL)
  })

  it('should switch to an emoji icon when the user picks the emoji tab', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'preset', value: 'github', bgColor: '' }))

    await wrapper.find('.current-icon').trigger('click')
    await wrapper.findAll('.icon-type-btn')[0].trigger('click')
    await wrapper.find('.btn-save').trigger('click')

    expect(savedIcon(wrapper).type).toBe('emoji')
  })

  it('should switch to an initial icon when the user picks a colour', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'preset', value: 'github', bgColor: '' }))

    await wrapper.find('.current-icon').trigger('click')
    await wrapper.findAll('.icon-type-btn')[1].trigger('click')
    await wrapper.find('.color-item').trigger('click')
    await wrapper.find('.btn-save').trigger('click')

    const icon = savedIcon(wrapper)
    expect(icon.type).toBe('initial')
    expect(icon.value).toBe('A')
    expect(icon.bgColor).toBeTruthy()
  })
})