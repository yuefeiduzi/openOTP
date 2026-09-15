import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  copyToClipboard,
  clearClipboard,
  scheduleClearClipboard,
  cancelScheduledClear,
} from './clipboard'

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  vi.useFakeTimers()
  writeText.mockClear()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  cancelScheduledClear()
})

afterEach(() => {
  cancelScheduledClear()
  vi.useRealTimers()
})

describe('copyToClipboard', () => {
  it('should write the text and report success', async () => {
    await expect(copyToClipboard('123456')).resolves.toBe(true)
    expect(writeText).toHaveBeenCalledWith('123456')
  })

  it('should report a refusal instead of throwing', async () => {
    writeText.mockRejectedValue(new Error('denied'))

    await expect(copyToClipboard('123456')).resolves.toBe(false)
  })
})

describe('clearClipboard', () => {
  it('should overwrite the clipboard with an empty string', async () => {
    await clearClipboard()
    expect(writeText).toHaveBeenCalledWith('')
  })

  it('should not throw when the platform refuses', async () => {
    writeText.mockRejectedValue(new Error('denied'))

    await expect(clearClipboard()).resolves.toBeUndefined()
  })
})

describe('scheduleClearClipboard', () => {
  it('should wipe the clipboard after the delay', async () => {
    scheduleClearClipboard(30)

    vi.advanceTimersByTime(29_000)
    expect(writeText).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1_000)
    expect(writeText).toHaveBeenCalledWith('')
  })

  it('should replace a pending wipe with the newer one', async () => {
    scheduleClearClipboard(30)
    vi.advanceTimersByTime(20_000)

    scheduleClearClipboard(60)
    vi.advanceTimersByTime(40_000)
    // The first timer would have fired by now.
    expect(writeText).not.toHaveBeenCalled()

    vi.advanceTimersByTime(20_000)
    expect(writeText).toHaveBeenCalledTimes(1)
  })

  it('should leave the clipboard alone when the delay is zero', async () => {
    scheduleClearClipboard(30)
    scheduleClearClipboard(0)

    vi.advanceTimersByTime(120_000)

    expect(writeText).not.toHaveBeenCalled()
  })

  it('should cancel a pending wipe on request', async () => {
    scheduleClearClipboard(30)
    cancelScheduledClear()

    vi.advanceTimersByTime(120_000)

    expect(writeText).not.toHaveBeenCalled()
  })
})