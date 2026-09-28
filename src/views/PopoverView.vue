<script setup lang="ts">
import { onUnmounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useI18n } from 'vue-i18n'
import { useSettingsStore } from '@/stores'
import { useAccountEditor } from '@/composables/useAccountEditor'
import AccountCodeList from '@/components/AccountCodeList.vue'
import AddAccount from '@/components/AddAccount.vue'
import DeleteConfirm from '@/components/DeleteConfirm.vue'
import EditAccount from '@/components/EditAccount.vue'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const {
  showAdd,
  showDelete,
  showEdit,
  deletingAccount,
  editingAccount,
  isModalOpen,
  openAdd,
  closeAdd,
  handleAddAccount,
  handleEdit,
  closeEdit,
  handleEditSave,
  handleDelete,
  closeDelete,
  confirmDelete,
} = useAccountEditor()

// Modals that open a native file dialog move focus away from the popover, and the
// Rust side hides the window on focus loss — pin the popover while one is open.
watch(isModalOpen, (open) => {
  invoke('set_popover_pinned', { pinned: open }).catch(() => {})
})

onUnmounted(() => {
  invoke('set_popover_pinned', { pinned: false }).catch(() => {})
})

// macOS has no tray menu (AppKit opens it on any click, which would swallow the
// popover toggle), so the popover carries the quit action itself.
async function quitApp() {
  await invoke('quit_app')
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
        <button class="popover-icon-btn" :title="t('addAccount.title')" @click="openAdd">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
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
        <button class="popover-icon-btn" :title="t('popover.quit')" @click="quitApp">
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
            <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
            <path d="M12 2v10" />
          </svg>
        </button>
      </div>
    </header>
    <AccountCodeList
      @delete="handleDelete"
      @edit="handleEdit"
      @add="openAdd"
    />

    <AddAccount
      :visible="showAdd"
      @close="closeAdd"
      @add="handleAddAccount"
    />

    <DeleteConfirm
      :visible="showDelete"
      :account-name="deletingAccount?.issuer || deletingAccount?.name || ''"
      @close="closeDelete"
      @confirm="confirmDelete"
    />

    <EditAccount
      :visible="showEdit"
      :account="editingAccount"
      @close="closeEdit"
      @save="handleEditSave"
    />
  </div>
</template>

<style scoped>
/* The panel itself (window #app), the raised palette and the inset live in
   style.css: the popover also renders the unlock screen, where this component
   is never mounted and its styles would not load. */
.popover {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
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

</style>
