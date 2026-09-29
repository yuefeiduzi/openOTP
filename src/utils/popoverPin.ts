import { invoke } from '@tauri-apps/api/core'

type Apply = (pinned: boolean) => Promise<void>

const applyNative: Apply = async (pinned) => {
  await invoke('set_popover_pinned', { pinned })
}

/**
 * Reasons that keep the menu bar popover from hiding itself on focus loss.
 *
 * The popover hides 200 ms after it loses key status, which is what a menu bar
 * panel should do. It also fires when the app is deactivated while the unlock
 * screen is up, though, and then the panel the user is typing into vanishes and
 * has to be reopened from the tray. A pin holds it in place for as long as the
 * reason applies; pins nest, so releasing one reason must not drop the panel
 * while another still holds it.
 */
export function createPopoverPin(apply: Apply = applyNative) {
  const reasons = new Set<string>()

  async function sync(): Promise<void> {
    // A failed command only means the pin never took effect, in which case the
    // panel behaves as before (auto-hide on focus loss). Nothing to report.
    await apply(reasons.size > 0).catch(() => {})
  }

  return {
    async pin(reason: string): Promise<void> {
      reasons.add(reason)
      await sync()
    },
    async unpin(reason: string): Promise<void> {
      reasons.delete(reason)
      await sync()
    },
    isPinned(): boolean {
      return reasons.size > 0
    },
  }
}

export const popoverPin = createPopoverPin()