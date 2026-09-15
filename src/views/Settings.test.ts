import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises, DOMWrapper } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import type { Account } from '@/types'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key: string, params?: Record<string, unknown>) => (params ? `${key}:${JSON.stringify(params)}` : key) }),
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}))

const invokeMock = vi.fn()
vi.mock('@tauri-apps/api/core', () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
}))

const saveMock = vi.fn()
const openMock = vi.fn()
vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: (...args: unknown[]) => saveMock(...args),
  open: (...args: unknown[]) => openMock(...args),
}))

vi.mock('@tauri-apps/plugin-fs', () => ({
  readTextFile: vi.fn(),
  writeFile: vi.fn(),
}))

const showToastMock = vi.fn()
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ show: showToastMock }),
}))

vi.mock('@/composables/useTheme', () => ({
  useTheme: () => ({ setTheme: vi.fn() }),
}))

vi.mock('@/locales', () => ({
  setLocale: vi.fn(),
  getSavedLocalePreference: () => 'auto',
}))

import Settings from './Settings.vue'
import { useAccountStore, useSettingsStore } from '@/stores'

const account: Account = {
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

const importAccountsSpy = vi.fn()

/** BottomSheet teleports its content to <body>, outside the mounted wrapper. */
const body = () => new DOMWrapper(document.body)

function mountSettings() {
  const store = useAccountStore()
  store.accounts = [account]
  store.importAccounts = importAccountsSpy
  return mount(Settings)
}

/** Opens the export sheet from the data management section. */
async function openExportSheet(wrapper: ReturnType<typeof mountSettings>) {
  const button = wrapper.findAll('.setting-btn').find(b => b.text().includes('settings.exportBackup'))
  await button!.trigger('click')
  await flushPromises()
}

function sheetButton(label: string) {
  return body().findAll('button').find(b => b.text().includes(label))!
}

beforeEach(() => {
  document.body.innerHTML = ''
  setActivePinia(createPinia())
  vi.clearAllMocks()
  invokeMock.mockResolvedValue({})
  saveMock.mockResolvedValue('/tmp/backup.zip')
  openMock.mockResolvedValue('/tmp/backup.zip')
})

describe('Settings backup export', () => {
  it('should default to the encrypted option', async () => {
    const wrapper = mountSettings()

    await openExportSheet(wrapper)

    const radios = body().findAll('.export-options input[type="radio"]')
    expect((radios[0].element as HTMLInputElement).checked).toBe(true)
    expect(body().find('.export-warning').exists()).toBe(false)
  })

  it('should warn and export without a password when encryption is turned off', async () => {
    const wrapper = mountSettings()
    await openExportSheet(wrapper)

    await body().findAll('.export-options input[type="radio"]')[1].setValue()
    expect(body().find('.export-warning').exists()).toBe(true)

    await sheetButton('settings.startExport').trigger('click')
    await flushPromises()
    await new Promise(r => setTimeout(r, 400))
    await flushPromises()

    expect(invokeMock).toHaveBeenCalledWith('export_backup', {
      path: '/tmp/backup.zip',
      accounts: [account],
      password: null,
    })
  })

  it('should reject a short backup password', async () => {
    const wrapper = mountSettings()
    await openExportSheet(wrapper)

    await sheetButton('settings.startExport').trigger('click')
    await flushPromises()

    await wrapper.find('input[type="password"]').setValue('short')
    await wrapper.findAll('button').find(b => b.text().includes('settings.startExport'))!.trigger('click')
    await flushPromises()

    expect(wrapper.find('.form-error').text()).toContain('errors.backupPasswordTooShort')
    expect(invokeMock).not.toHaveBeenCalledWith('export_backup', expect.anything())
  })

  it('should export with the chosen password', async () => {
    const wrapper = mountSettings()
    await openExportSheet(wrapper)

    await sheetButton('settings.startExport').trigger('click')
    await flushPromises()

    await wrapper.find('input[type="password"]').setValue('correct horse battery')
    await wrapper.findAll('button').find(b => b.text().includes('settings.startExport'))!.trigger('click')
    await flushPromises()

    expect(invokeMock).toHaveBeenCalledWith('export_backup', {
      path: '/tmp/backup.zip',
      accounts: [account],
      password: 'correct horse battery',
    })
  })
})

describe('Settings lock controls', () => {
  it('should lock the app from the lock button', async () => {
    const wrapper = mountSettings()
    const settings = useSettingsStore()
    settings.completeSetup(true)
    expect(settings.isLocked).toBe(false)

    const button = wrapper.findAll('.setting-btn').find(b => b.text().includes('settings.lockApp'))
    await button!.trigger('click')
    await flushPromises()

    expect(settings.isLocked).toBe(true)
  })

  it('should show the current lock timeout and let it change', async () => {
    const wrapper = mountSettings()
    const settings = useSettingsStore()
    settings.updateSettings({ lockTimeout: 1 })

    const button = wrapper.findAll('.setting-btn').find(b => b.text().includes('settings.lockTimeout'))
    expect(button!.text()).toContain('settings.lock1min')

    await button!.trigger('click')
    await flushPromises()

    const options = body().findAll('.lang-option')
    expect(options.length).toBe(3)

    await options[2].trigger('click')
    await flushPromises()

    expect(settings.settings.lockTimeout).toBe(5)
    expect(invokeMock).toHaveBeenCalledWith('save_settings', expect.anything())
  })
})

describe('Settings backup import', () => {
  it('should import an unencrypted backup without asking for a password', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'inspect_backup') {
        return Promise.resolve({ format: 'openotp-backup', formatVersion: 1, appVersion: '0.1.0', createdAt: 0, accountCount: 1, encrypted: false })
      }
      if (command === 'import_backup') {
        return Promise.resolve({
          manifest: { format: 'openotp-backup', formatVersion: 1, appVersion: '0.1.0', createdAt: 0, accountCount: 1, encrypted: false },
          accounts: [account],
        })
      }
      return Promise.resolve({})
    })

    const wrapper = mountSettings()
    const button = wrapper.findAll('.setting-btn').find(b => b.text().includes('settings.importBackup'))
    await button!.trigger('click')
    await flushPromises()

    expect(invokeMock).toHaveBeenCalledWith('import_backup', { path: '/tmp/backup.zip', password: null })
    expect(importAccountsSpy).toHaveBeenCalledWith([account])
  })

  it('should ask for a password when the backup is encrypted', async () => {
    invokeMock.mockImplementation((command: string) => {
      if (command === 'inspect_backup') {
        return Promise.resolve({ format: 'openotp-backup', formatVersion: 1, appVersion: '0.1.0', createdAt: 0, accountCount: 1, encrypted: true })
      }
      return Promise.resolve({})
    })

    const wrapper = mountSettings()
    const button = wrapper.findAll('.setting-btn').find(b => b.text().includes('settings.importBackup'))
    await button!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('settings.importBackup')
    expect(wrapper.find('input[type="password"]').exists()).toBe(true)
    expect(importAccountsSpy).not.toHaveBeenCalled()
  })
})