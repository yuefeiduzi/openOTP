import { describe, it, expect, vi, beforeEach } from 'vitest'

const listen = vi.fn()
vi.mock('@tauri-apps/api/event', () => ({
  listen: (...args: unknown[]) => listen(...args),
}))

import { syncSettingsOnChange } from './settingsSync'

describe('syncSettingsOnChange', () => {
  beforeEach(() => {
    listen.mockReset()
  })

  it('should reload the settings when Rust reports a save', async () => {
    const reload = vi.fn().mockResolvedValue(undefined)
    let handler: (() => void) | undefined
    listen.mockImplementation((_event: string, callback: () => void) => {
      handler = callback
      return Promise.resolve(() => {})
    })

    await syncSettingsOnChange(reload)

    expect(listen).toHaveBeenCalledWith('settings-changed', expect.any(Function))
    handler?.()
    expect(reload).toHaveBeenCalled()
  })

  // The same module is loaded in a plain browser by the unit tests; there is no
  // event bus to subscribe to and that must not be fatal.
  it('should survive running outside Tauri', async () => {
    listen.mockRejectedValue(new Error('not running under tauri'))

    await expect(syncSettingsOnChange(vi.fn())).resolves.toBeUndefined()
  })
})