<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { invoke } from '@tauri-apps/api/core'
import { useAccountStore, useSettingsStore } from '@/stores'
import { useAccountEditor } from '@/composables/useAccountEditor'
import AccountCodeList from '@/components/AccountCodeList.vue'
import AddAccount from '@/components/AddAccount.vue'
import DeleteConfirm from '@/components/DeleteConfirm.vue'
import EditAccount from '@/components/EditAccount.vue'

const router = useRouter()
const accountStore = useAccountStore()
const settingsStore = useSettingsStore()
const { t } = useI18n()
const isDesktop = ref(false)

const {
  showAdd,
  showDelete,
  showEdit,
  deletingAccount,
  editingAccount,
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

onMounted(async () => {
  await accountStore.loadAccounts()
  await settingsStore.loadSettings()
  isDesktop.value = await invoke<boolean>('is_desktop')
})

async function enterMenuBarMode() {
  settingsStore.updateSettings({ menuBarOnly: true })
  await settingsStore.saveSettings()
  await invoke('set_menu_bar_only', { enabled: true })
  await invoke('hide_main_window')
}

function goToSettings() {
  router.push('/settings')
}
</script>

<template>
  <div class="home">
    <header class="header">
      <h1>{{ t('home.title') }}</h1>
      <button class="settings-btn" :title="t('settings.title')" @click="goToSettings">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </header>

    <button v-if="isDesktop" class="menu-bar-entry" @click="enterMenuBarMode">
      <svg
        class="menu-bar-entry-icon"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <line x1="3" y1="5" x2="21" y2="5" stroke-width="3" />
        <rect x="8" y="10" width="8" height="9" rx="2" />
      </svg>
      <span class="menu-bar-entry-text">
        <span class="menu-bar-entry-title">{{ t('home.menuBarMode') }}</span>
        <span class="menu-bar-entry-desc">{{ t('home.menuBarModeDesc') }}</span>
      </span>
      <span class="menu-bar-entry-arrow">›</span>
    </button>

    <AccountCodeList
      @delete="handleDelete"
      @edit="handleEdit"
      @add="openAdd"
    />

    <button class="add-btn" @click="openAdd">+</button>

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
.home {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px;
  background: var(--bg-primary);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.header h1 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
}

.settings-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  color: var(--text-primary);
  transition: opacity 0.2s;
}

.settings-btn:hover {
  opacity: 0.7;
}

.menu-bar-entry {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 14px;
  margin-bottom: 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  cursor: pointer;
  color: var(--text-primary);
  text-align: left;
  transition: background 0.15s, border-color 0.15s;
}

.menu-bar-entry:hover {
  background: var(--btn-secondary-bg);
  border-color: var(--accent);
}

.menu-bar-entry-icon {
  flex-shrink: 0;
  color: var(--accent);
}

.menu-bar-entry-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.menu-bar-entry-title {
  font-size: 14px;
  font-weight: 600;
}

.menu-bar-entry-desc {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.menu-bar-entry-arrow {
  margin-left: auto;
  font-size: 20px;
  color: var(--text-secondary);
}

.add-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: var(--accent);
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--toast-bg);
  color: var(--toast-text);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  z-index: var(--z-toast);
  pointer-events: none;
}
</style>
