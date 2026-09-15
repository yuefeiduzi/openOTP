/** Clipboard helpers with a scheduled wipe for copied verification codes. */

let clearTimer: ReturnType<typeof setTimeout> | null = null

/** Copies text, reporting whether the platform accepted it. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/** Empties the clipboard, ignoring platforms that refuse. */
export async function clearClipboard(): Promise<void> {
  try {
    await navigator.clipboard.writeText('')
  } catch {
    // Nothing useful to do: the clipboard is unavailable or denied.
  }
}

/**
 * Wipes the clipboard after `delaySeconds`, replacing any wipe already
 * scheduled. A delay of 0 (or less) means "never", which cancels the pending
 * wipe and leaves the clipboard alone.
 */
export function scheduleClearClipboard(delaySeconds: number): void {
  cancelScheduledClear()

  if (delaySeconds <= 0) {
    return
  }

  clearTimer = setTimeout(() => {
    clearTimer = null
    void clearClipboard()
  }, delaySeconds * 1000)
}

export function cancelScheduledClear(): void {
  if (clearTimer !== null) {
    clearTimeout(clearTimer)
    clearTimer = null
  }
}