import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

import router from './index'
import { useSettingsStore } from '@/stores'
import { invoke } from '@tauri-apps/api/core'

/** Pretends the backend knows about setup and a stored password. */
function setupExists(hasPassword = true) {
  vi.mocked(invoke).mockImplementation((command: string) => {
    if (command === 'has_setup') {
      return Promise.resolve({ is_setup: true, has_password: hasPassword })
    }
    return Promise.resolve(undefined)
  })
}

beforeEach(async () => {
  setActivePinia(createPinia())
  vi.clearAllMocks()
  setupExists()
  await router.replace('/')
  await router.isReady()
})

describe('router lock guard', () => {
  it('should not let the popover bypass the lock', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.lock()

    await router.push('/popover')

    expect(router.currentRoute.value.name).toBe('unlock')
  })

  it('should let the tray menu through while locked', async () => {
    // 托盘右键菜单只提供「偏好设置 / 退出」，不显示任何账号数据，锁屏时也必须能用，
    // 否则锁屏后就没有退出入口了
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.lock()

    await router.push('/tray-menu')

    expect(router.currentRoute.value.name).toBe('tray-menu')
  })

  it('should remember the popover as the post-unlock destination', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.lock()

    await router.push('/popover')

    expect(router.currentRoute.value.query.redirect).toBe('/popover')
  })

  it('should remember any other guarded destination too', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.lock()

    await router.push('/settings')

    expect(router.currentRoute.value.name).toBe('unlock')
    expect(router.currentRoute.value.query.redirect).toBe('/settings')
  })

  it('should let the popover through once unlocked', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)

    await router.push('/popover')

    expect(router.currentRoute.value.name).toBe('popover')
  })

  it('should not add a redirect when the target is home', async () => {
    const settings = useSettingsStore()
    settings.completeSetup(true)
    settings.lock()

    await router.push('/')

    expect(router.currentRoute.value.name).toBe('unlock')
    expect(router.currentRoute.value.query.redirect).toBeUndefined()
  })

  it('should unlock by itself when no password is set', async () => {
    setupExists(false)
    const settings = useSettingsStore()
    settings.completeSetup(false)
    settings.lock()

    await router.push('/popover')

    expect(router.currentRoute.value.name).toBe('popover')
  })

  it('should send an unconfigured app to setup', async () => {
    vi.mocked(invoke).mockImplementation((command: string) => {
      if (command === 'has_setup') {
        return Promise.resolve({ is_setup: false, has_password: false })
      }
      return Promise.resolve(undefined)
    })

    await router.push('/popover')

    expect(router.currentRoute.value.name).toBe('setup')
  })
})