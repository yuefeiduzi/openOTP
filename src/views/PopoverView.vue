<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'
import AccountCodeList from '@/components/AccountCodeList.vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()

onMounted(() => document.documentElement.classList.add('popover-route'))
onUnmounted(() => document.documentElement.classList.remove('popover-route'))

async function openMainWindow() {
  await invoke('show_main_window')
}

async function returnToAppMode() {
  settingsStore.updateSettings({ menuBarOnly: false })
  await settingsStore.saveSettings()
  await invoke('set_menu_bar_only', { enabled: false })
  await invoke('show_main_window')
}
</script>

<template>
  <div class="popover">
    <header class="popover-header">
      <span class="popover-title">OpenOTP</span>
      <div class="popover-actions">
        <button
          class="return-btn"
          :title="t('popover.returnToApp')"
          @click="returnToAppMode"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M19 12H5" />
            <path d="M12 19l-7-7 7-7" />
          </svg>
          <span>{{ t('popover.returnToApp') }}</span>
        </button>
        <button class="popover-icon-btn" :title="t('popover.openMain')" @click="openMainWindow">
          <img class="popover-icon" src="/icon.png" alt="OpenOTP" />
        </button>
      </div>
    </header>
    <AccountCodeList />
  </div>
</template>

<style scoped>
/* The popover window is transparent (see lib.rs); keep the page background
   clear so only the rounded panel shows. The panel sits inset from the window
   edges — the transparent margin lets the CSS drop-shadow render around the
   rounded corners (a native window shadow would be a rectangle and stick out).
   The shadow uses a tight 0.5px hard pass + a close blur, so the edge stays
   crisp instead of hazy. */
:global(html.popover-route),
:global(html.popover-route body),
:global(html.popover-route #app) {
  background: transparent;
  overflow: hidden;
}

.popover {
  position: absolute;
  inset: 12px;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  filter: var(--popover-shadow);
}

.popover-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.popover-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
}

.popover-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.return-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  transition: background 0.15s, color 0.15s;
  white-space: nowrap;
}

.return-btn:hover {
  background: var(--btn-secondary-bg);
  color: var(--text-primary);
}

.popover-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 8px;
  color: var(--text-secondary);
  transition: background 0.15s;
}

.popover-icon-btn:hover {
  background: var(--bg-secondary);
}

.popover-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
}
</style>
