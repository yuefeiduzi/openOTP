import { describe, it, expect, vi, afterEach } from 'vitest'
import { DOMWrapper, mount, type VueWrapper } from '@vue/test-utils'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}))

import ContextMenu from './ContextMenu.vue'

const wrappers: VueWrapper[] = []

function mountMenu(x = 100, y = 100, visible = true) {
  const wrapper = mount(ContextMenu, { props: { visible, x, y } })
  wrappers.push(wrapper)
  return wrapper
}

/** Teleported content lives in document.body, not under the wrapper. */
function body() {
  return new DOMWrapper(document.body)
}

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) {
    wrapper.unmount()
  }
})

describe('ContextMenu', () => {
  it('should render nothing while hidden', () => {
    mountMenu(100, 100, false)

    expect(body().find('.context-menu').exists()).toBe(false)
  })

  it('should offer delete at the click position', () => {
    mountMenu(100, 120)

    const menu = body().find('.context-menu')
    expect(menu.exists()).toBe(true)
    expect(menu.attributes('style')).toContain('left: 100px')
    expect(menu.attributes('style')).toContain('top: 120px')
    expect(body().find('.context-menu-item').text()).toBe('common.delete')
  })

  it('should emit delete from the entry', async () => {
    const wrapper = mountMenu()

    await body().find('.context-menu-item').trigger('click')

    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('should close when clicking outside', async () => {
    const wrapper = mountMenu()

    await body().find('.context-menu-overlay').trigger('mousedown')

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('should close on escape', () => {
    const wrapper = mountMenu()

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))

    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  // A right click near the window edge must not push the menu off screen.
  it('should keep an edge click on screen', () => {
    mountMenu(window.innerWidth, window.innerHeight)

    const style = body().find('.context-menu').attributes('style') ?? ''
    const left = Number(style.match(/left: (\d+)px/)?.[1])
    const top = Number(style.match(/top: (\d+)px/)?.[1])

    expect(left).toBeGreaterThan(0)
    expect(left).toBeLessThan(window.innerWidth)
    expect(top).toBeGreaterThan(0)
    expect(top).toBeLessThan(window.innerHeight)
  })
})