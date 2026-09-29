import { listen } from '@tauri-apps/api/event'

/**
 * Keeps every window's settings store in step with the saved settings.
 *
 * Each window is its own webview with its own Pinia store, and the menu bar
 * popover and tray menu are created once and then only shown and hidden. They
 * used to keep whatever they read when the webview was created, so a theme or
 * language change made in the main window never reached them. Rust broadcasts
 * on save and every window reloads — the one that saved included.
 */
export async function syncSettingsOnChange(reload: () => Promise<void>): Promise<void> {
  try {
    await listen('settings-changed', () => {
      void reload()
    })
  } catch {
    // Running outside Tauri (unit tests, plain browser): nothing to listen to.
  }
}