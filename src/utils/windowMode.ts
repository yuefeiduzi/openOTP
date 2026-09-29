import { getCurrentWindow } from '@tauri-apps/api/window'

/**
 * Which window this webview is, or '' outside Tauri (unit tests, a plain
 * browser). The menu bar popover and the tray's secondary-click menu are the
 * same app in separate windows with separate stores, so a few behaviours have
 * to branch on it.
 */
export function currentWindowLabel(): string {
  try {
    return getCurrentWindow().label
  } catch {
    return ''
  }
}

/** True inside the menu bar / tray popover window. */
export function isPopoverWindow(): boolean {
  return currentWindowLabel() === 'popover'
}