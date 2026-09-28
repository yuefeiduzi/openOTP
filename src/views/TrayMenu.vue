<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

/**
 * The tray's secondary-click menu. It is a window of its own (see lib.rs) because
 * macOS opens a menu attached to the status item on *any* click, which would
 * swallow the left click that toggles the popover.
 */
async function openPreferences() {
  await invoke('open_preferences')
  await getCurrentWindow().hide()
}

async function quitApp() {
  await invoke('quit_app')
}
</script>

<template>
  <div class="tray-menu">
    <button class="tray-menu-item" @click="openPreferences">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
      <span>{{ t('trayMenu.preferences') }}</span>
    </button>

    <div class="tray-menu-divider" />

    <button class="tray-menu-item" @click="quitApp">
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <path d="M12 2v10" />
      </svg>
      <span>{{ t('trayMenu.quit') }}</span>
    </button>
  </div>
</template>

<style scoped>
.tray-menu {
  display: flex;
  flex-direction: column;
  padding: 4px;
}

.tray-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-primary);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
}

.tray-menu-item:hover {
  background: var(--bg-secondary);
}

.tray-menu-divider {
  height: 1px;
  margin: 4px 8px;
  background: var(--border-color);
}
</style>