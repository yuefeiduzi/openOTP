import { describe, it, expect, vi } from 'vitest'
import { createPopoverPin } from './popoverPin'

describe('popoverPin', () => {
  it('should pin while any reason holds it and release only after the last one', async () => {
    const apply = vi.fn().mockResolvedValue(undefined)
    const pin = createPopoverPin(apply)

    await pin.pin('unlock')
    expect(apply).toHaveBeenLastCalledWith(true)

    await pin.pin('biometric')
    await pin.unpin('unlock')
    expect(apply).toHaveBeenLastCalledWith(true)
    expect(pin.isPinned()).toBe(true)

    await pin.unpin('biometric')
    expect(apply).toHaveBeenLastCalledWith(false)
    expect(pin.isPinned()).toBe(false)
  })

  it('should treat the same reason twice as one pin', async () => {
    const apply = vi.fn().mockResolvedValue(undefined)
    const pin = createPopoverPin(apply)

    await pin.pin('unlock')
    await pin.pin('unlock')
    await pin.unpin('unlock')

    expect(apply).toHaveBeenLastCalledWith(false)
  })

  // The command only exists inside Tauri; failing to pin must not break the
  // unlock screen, it just leaves the panel with its normal auto-hide.
  it('should not reject when the pin command fails', async () => {
    const apply = vi.fn().mockRejectedValue(new Error('no such window'))
    const pin = createPopoverPin(apply)

    await expect(pin.pin('unlock')).resolves.toBeUndefined()
    expect(pin.isPinned()).toBe(true)
  })
})
