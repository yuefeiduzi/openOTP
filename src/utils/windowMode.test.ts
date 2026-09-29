import { describe, it, expect, vi, afterEach } from 'vitest'

const getCurrentWindow = vi.fn()
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => getCurrentWindow(),
}))

afterEach(() => {
  vi.resetModules()
  getCurrentWindow.mockReset()
})

describe('windowMode', () => {
  it('should report the popover window', async () => {
    getCurrentWindow.mockReturnValue({ label: 'popover' })
    const { isPopoverWindow, currentWindowLabel } = await import('./windowMode')

    expect(isPopoverWindow()).toBe(true)
    expect(currentWindowLabel()).toBe('popover')
  })

  it('should not mistake another window for the popover', async () => {
    getCurrentWindow.mockReturnValue({ label: 'main' })
    const { isPopoverWindow } = await import('./windowMode')

    expect(isPopoverWindow()).toBe(false)
  })

  // The module also loads in unit tests and a plain browser: there is no Tauri
  // window to ask, and that must not throw.
  it('should return nothing outside Tauri', async () => {
    getCurrentWindow.mockImplementation(() => {
      throw new Error('not running under tauri')
    })
    const { isPopoverWindow, currentWindowLabel } = await import('./windowMode')

    expect(currentWindowLabel()).toBe('')
    expect(isPopoverWindow()).toBe(false)
  })
})
