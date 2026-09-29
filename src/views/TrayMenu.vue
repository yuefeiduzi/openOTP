<script setup lang="ts">
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

/**
 * The tray's secondary-click menu. It is a window of its own (see lib.rs) because
 * macOS opens a menu attached to the status item on *any* click, which would
 * swallow the left click that toggles the popover.
 *
 * Only 退出 lives here: everything else (添加、偏好设置、返回 App 模式) is reachable
 * from the popover or the main window.
 */
async function quitApp() {
  await invoke('quit_app')
}
</script>

<template>
  <div class="tray-menu">
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
</style>
