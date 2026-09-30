import { describe, it, expect } from 'vitest'
import { suppressNativeContextMenu } from './contextMenu'

describe('contextMenu', () => {
  it('should swallow the webview context menu', () => {
    suppressNativeContextMenu()

    const event = new Event('contextmenu', { cancelable: true })
    document.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
  })
})