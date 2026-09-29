import { describe, it, expect, vi, beforeEach } from 'vitest'
import { copyToClipboard } from './clipboard'

const writeText = vi.fn().mockResolvedValue(undefined)

beforeEach(() => {
  writeText.mockClear()
  writeText.mockResolvedValue(undefined)
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
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
