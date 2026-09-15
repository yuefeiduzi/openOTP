import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import AddAccount from './AddAccount.vue'

const body = () => new DOMWrapper(document.body)

function mountAdd() {
  return mount(AddAccount, { props: { visible: true } })
}

/** Switches to the manual tab and fills in a usable account. */
async function fillManual(wrapper: ReturnType<typeof mountAdd>) {
  const tabs = wrapper.findAll('.tab-btn')
  await tabs[2].trigger('click')
  await flushPromises()

  await wrapper.find('input[placeholder="addAccount.accountNamePlaceholder"]').setValue('alice@example.com')
  await wrapper.find('input[placeholder="addAccount.secretPlaceholder"]').setValue('JBSWY3DPEHPK3PXP')
  await flushPromises()
}

function addedData(wrapper: ReturnType<typeof mountAdd>): Partial<Account> {
  const events = wrapper.emitted('add') as unknown as [Partial<Account>][]
  return events[0][0]
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('AddAccount icons', () => {
  it('should derive an initial icon from the account name by default', async () => {
    const wrapper = mountAdd()
    await fillManual(wrapper)

    await wrapper.find('.btn-add').trigger('click')

    expect(addedData(wrapper).icon).toMatchObject({ type: 'initial', value: 'A' })
  })

  it('should save the icon picked in the sheet', async () => {
    const wrapper = mountAdd()
    await fillManual(wrapper)

    await wrapper.find('.current-icon').trigger('click')
    await flushPromises()
    await body().findAll('.tab-btn')[3].trigger('click')
    await body().find('.preset-item').trigger('click')
    await body().find('.btn-confirm').trigger('click')
    await flushPromises()

    await wrapper.find('.btn-add').trigger('click')

    expect(addedData(wrapper).icon).toMatchObject({ type: 'preset' })
    expect(addedData(wrapper).icon!.value).toBeTruthy()
  })

  it('should refresh the preview while typing a name', async () => {
    const wrapper = mountAdd()
    await fillManual(wrapper)

    await wrapper.find('input[placeholder="addAccount.accountNamePlaceholder"]').setValue('github')
    await flushPromises()

    expect(wrapper.find('.icon-display-text').text()).toBe('G')
  })
})