<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAccountStore } from '@/stores'
import type { Account } from '@/types'
import AccountCard from '@/components/AccountCard.vue'
import AddAccount from '@/components/AddAccount.vue'
import DeleteConfirm from '@/components/DeleteConfirm.vue'
import EditAccount from '@/components/EditAccount.vue'

const router = useRouter()
const accountStore = useAccountStore()
const activeTab = ref<'totp' | 'hotp'>('totp')

const showAdd = ref(false)
const showDelete = ref(false)
const showEdit = ref(false)
const showToast = ref(false)
const deletingAccount = ref<Account | null>(null)
const editingAccount = ref<Account | null>(null)
const copiedCode = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

onMounted(() => {
  accountStore.loadAccounts()
})

function goToSettings() {
  router.push('/settings')
}

function handleCopy(code: string) {
  navigator.clipboard.writeText(code)
  copiedCode.value = code
  showToast.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToast.value = false
  }, 2000)
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
  const newAccount: Account = {
    id: '',
    name: data.name || '',
    issuer: data.issuer || '',
    icon: data.icon || { type: 'emoji', value: '🔑', bgColor: '' },
    type: data.type || 'totp',
    secret: data.secret || '',
    algorithm: data.algorithm || 'sha1',
    digits: data.digits || 6,
    period: data.period || 30,
    counter: data.counter || 0,
    createdAt: Date.now(),
    order: accountStore.accounts.length,
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
      <h1>openOTP</h1>
      <button class="settings-btn" @click="goToSettings">
        <span>⚙</span>
      </button>
    </header>

    <div class="tabs">
      <button
        :class="['tab', { active: activeTab === 'totp' }]"
        @click="activeTab = 'totp'"
      >
        TOTP
      </button>
      <button
        :class="['tab', { active: activeTab === 'hotp' }]"
        @click="activeTab = 'hotp'"
      >
        HOTP
      </button>
    </div>

    <div class="account-list">
      <div v-if="activeTab === 'totp'">
        <p v-if="accountStore.totpAccounts.length === 0" class="empty">
          No TOTP accounts
        </p>
        <AccountCard
          v-for="account in accountStore.totpAccounts"
          :key="account.id"
          :account="account"
          @copy="handleCopy"
          @delete="handleDelete(account)"
          @refresh="handleEdit(account)"
        />
      </div>
      <div v-else>
        <p v-if="accountStore.hotpAccounts.length === 0" class="empty">
          No HOTP accounts
        </p>
        <AccountCard
          v-for="account in accountStore.hotpAccounts"
          :key="account.id"
          :account="account"
          @copy="handleCopy"
          @delete="handleDelete(account)"
          @refresh="handleEdit(account)"
        />
      </div>
    </div>

    <button class="add-btn" @click="showAdd = true">+</button>

    <div v-if="showToast" class="toast">
      Copied {{ copiedCode }}
    </div>

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
}

.settings-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
}

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.tab {
  flex: 1;
  padding: 8px;
  border: none;
  border-radius: 8px;
  background: #f0f0f0;
  cursor: pointer;
}

.tab.active {
  background: #4a90d9;
  color: white;
}

.account-list {
  flex: 1;
  overflow-y: auto;
}

.empty {
  text-align: center;
  color: #999;
  padding: 32px;
}

.add-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: none;
  background: #4a90d9;
  color: white;
  font-size: 24px;
  cursor: pointer;
}

.toast {
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  z-index: 300;
  pointer-events: none;
}
</style>