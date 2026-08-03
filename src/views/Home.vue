<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '@/stores'
import type { Account } from '@/types'
import { getRandomBgColor } from '@/utils/icons'
import AccountCodeList from '@/components/AccountCodeList.vue'
import AddAccount from '@/components/AddAccount.vue'
import DeleteConfirm from '@/components/DeleteConfirm.vue'
import EditAccount from '@/components/EditAccount.vue'

const router = useRouter()
const accountStore = useAccountStore()
const { t } = useI18n()
const showAdd = ref(false)
const isMac = ref(false)
const showDelete = ref(false)
const showEdit = ref(false)
const deletingAccount = ref<Account | null>(null)
const editingAccount = ref<Account | null>(null)

onMounted(async () => {
  await accountStore.loadAccounts()
  isMac.value = await invoke<boolean>('is_macos')
})

async function minimizeToTray() {
  await invoke('hide_main_window')
}

function goToSettings() {
  router.push('/settings')
}

function handleDelete(account: Account) {
  deletingAccount.value = account
  showDelete.value = true
}

function confirmDelete() {
  if (deletingAccount.value) {
    accountStore.removeAccount(deletingAccount.value.id)
  }
  showDelete.value = false
  deletingAccount.value = null
}

function handleEdit(account: Account) {
  editingAccount.value = account
  showEdit.value = true
}

function handleAddAccount(data: Partial<Account>) {
  const displayName = data.name || data.issuer || ''
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?'

  const newAccount: Omit<Account, 'order'> = {
    id: '',
    name: data.name || '',
    issuer: data.issuer || '',
    icon: data.icon || { type: 'initial', value: initial, bgColor: getRandomBgColor() },
    type: 'totp',
    secret: data.secret || '',
    algorithm: data.algorithm || 'sha1',
    digits: data.digits || 6,
    period: data.period || 30,
    counter: 0,
    notes: '',
    createdAt: Date.now(),
  }
  accountStore.addAccount(newAccount)
  showAdd.value = false
}

function handleEditSave(data: Partial<Account>) {
  if (editingAccount.value) {
    accountStore.updateAccount(editingAccount.value.id, data)
  }
  showEdit.value = false
  editingAccount.value = null
}
</script>

<template>
  <div class="home">
    <header class="header">
      <h1>{{ t('home.title') }}</h1>
      <div class="header-actions">
        <button
          v-if="isMac"
          class="settings-btn"
          :title="t('home.minimizeToTray')"
          @click="minimizeToTray"
        >
          <span>–</span>
        </button>
        <button class="settings-btn" @click="goToSettings">
          <span>⚙</span>
        </button>
      </div>
    </header>

    <AccountCodeList
      @delete="handleDelete"
      @edit="handleEdit"
    />

    <button class="add-btn" @click="showAdd = true">+</button>

    <AddAccount
      :visible="showAdd"
      @close="showAdd = false"
      @add="handleAddAccount"
    />

    <DeleteConfirm
      :visible="showDelete"
      :account-name="deletingAccount?.issuer || deletingAccount?.name || ''"
      @close="showDelete = false"
      @confirm="confirmDelete"
    />

    <EditAccount
      :visible="showEdit"
      :account="editingAccount"
      @close="showEdit = false; editingAccount = null"
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.settings-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-primary);
  transition: opacity 0.2s;
}

.settings-btn:hover {
  opacity: 0.7;
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
  z-index: 300;
  pointer-events: none;
}
</style>