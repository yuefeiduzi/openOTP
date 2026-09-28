import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import EditAccount from './EditAccount.vue'

beforeEach(() => {
  document.body.innerHTML = ''
})

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

/** The icon picker lives in a BottomSheet, which teleports to <body>. */
const body = () => new DOMWrapper(document.body)

/** Opens the picker sheet from the current-icon row. */
async function openPicker(wrapper: ReturnType<typeof mountEditor>) {
  await wrapper.find('.current-icon').trigger('click')
  await flushPromises()
}

async function confirmPicker() {
  await body().find('.btn-confirm').trigger('click')
  await flushPromises()
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

    const img = wrapper.find('.icon-display-image')
    expect(img.attributes('src')).toBe(DATA_URL)
    // 上传图片自带配色，不能套用预设图标的深色主题处理
    expect(img.classes()).not.toContain('icon-display-image--low-contrast')
  })

  it('should preview a preset icon instead of a broken image', () => {
    const wrapper = mountEditor(makeAccount({ type: 'preset', value: 'github', bgColor: '' }))

    const img = wrapper.find('.icon-display-image')
    expect(img.exists()).toBe(true)
    expect(img.attributes('src')).toBeTruthy()
    // github 的 #181717 在深色底上等于看不见，靠这个类压成白色剪影
    expect(img.classes()).toContain('icon-display-image--low-contrast')
  })

  it('should replace a preset icon with the picked emoji', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'preset', value: 'github', bgColor: '' }))
    await openPicker(wrapper)

    // The picker is reachable now, which is the whole point of the sheet.
    await body().findAll('.tab-btn')[0].trigger('click')
    await body().find('.emoji-item').trigger('click')
    await confirmPicker()
    await wrapper.find('.btn-save').trigger('click')

    const icon = savedIcon(wrapper)
    expect(icon.type).toBe('emoji')
    expect(icon.value).toBeTruthy()
  })

  it('should pick a preset icon from the sheet', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'emoji', value: '', bgColor: '' }))
    await openPicker(wrapper)

    await body().findAll('.tab-btn')[3].trigger('click')
    await body().find('.preset-item').trigger('click')
    await confirmPicker()
    await wrapper.find('.btn-save').trigger('click')

    const icon = savedIcon(wrapper)
    expect(icon.type).toBe('preset')
    expect(icon.value).toBeTruthy()
  })

  it('should switch to an initial icon when the user picks a colour', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'preset', value: 'github', bgColor: '' }))
    await openPicker(wrapper)

    await body().findAll('.tab-btn')[1].trigger('click')
    await body().find('.color-item').trigger('click')
    await confirmPicker()
    await wrapper.find('.btn-save').trigger('click')

    const icon = savedIcon(wrapper)
    expect(icon.type).toBe('initial')
    expect(icon.bgColor).toBeTruthy()
    // The letter is derived from the account name when rendering, so picking a
    // colour alone does not have to store one.
    expect(wrapper.find('.icon-display-text').text()).toBe('A')
  })

  it('should keep the stored icon when the picker is closed without confirming', async () => {
    const wrapper = mountEditor(makeAccount({ type: 'image', value: DATA_URL, bgColor: '' }))
    await openPicker(wrapper)

    await body().findAll('.tab-btn')[0].trigger('click')
    await body().find('.emoji-item').trigger('click')
    await body().find('.btn-cancel').trigger('click')
    await flushPromises()
    await wrapper.find('.btn-save').trigger('click')

    expect(savedIcon(wrapper)).toEqual({ type: 'image', value: DATA_URL, bgColor: '' })
  })
})