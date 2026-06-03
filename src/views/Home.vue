<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAccountStore } from '@/stores'
import type { Account } from '@/types'
import { getRandomBgColor } from '@/utils/icons'
import { useToast } from '@/composables/useToast'
import AccountCard from '@/components/AccountCard.vue'
import AddAccount from '@/components/AddAccount.vue'
import DeleteConfirm from '@/components/DeleteConfirm.vue'
import EditAccount from '@/components/EditAccount.vue'

const router = useRouter()
const accountStore = useAccountStore()
const { t } = useI18n()
const { show: showToast } = useToast()

const showAdd = ref(false)
const showDelete = ref(false)
const showEdit = ref(false)
const deletingAccount = ref<Account | null>(null)
const editingAccount = ref<Account | null>(null)

const dragIndex = ref<number | null>(null)
const dragOverIndex = ref<number | null>(null)

function byOrder(a: Account, b: Account): number {
  return a.order - b.order
}

const displayedAccounts = computed(() =>
  accountStore.accounts.filter(a => a.type === 'totp').sort(byOrder)
)

onMounted(async () => {
  await accountStore.loadAccounts()
})

function goToSettings() {
  router.push('/settings')
}

function handleCopy(code: string) {
  navigator.clipboard.writeText(code)
  showToast(t('home.copied'))
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

function onDragStart(index: number, event: DragEvent) {
  dragIndex.value = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }
}

function onDragOver(index: number, event: DragEvent) {
  event.preventDefault()
  if (dragIndex.value === null || dragIndex.value === index) return
  event.dataTransfer!.dropEffect = 'move'

  dragOverIndex.value = index
}

function onDragLeave() {
  dragOverIndex.value = null
}

function onDrop(event: DragEvent) {
  event.preventDefault()
  dragOverIndex.value = null
}

function onDragEnd() {
  if (dragIndex.value === null) return

  const orderedIds = displayedAccounts.value.map(a => a.id)
  accountStore.reorderAccounts(orderedIds)
  dragIndex.value = null
  dragOverIndex.value = null
}

function handleAddAccount(data: Partial<Account>) {
  const displayName = data.name || data.issuer || ''
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?'

  const newAccount: Account = {
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
      <h1>{{ t('home.title') }}</h1>
      <button class="settings-btn" @click="goToSettings">
        <span>⚙</span>
      </button>
    </header>

    <div class="account-list">
      <p v-if="displayedAccounts.length === 0" class="empty">
        {{ t('home.noAccounts', { type: 'TOTP' }) }}
      </p>
      <div
        v-for="(account, index) in displayedAccounts"
        :key="account.id"
        class="account-wrapper"
        :class="{
          dragging: dragIndex === index,
          'drag-over': dragOverIndex === index,
        }"
        draggable="true"
        @dragstart="onDragStart(index, $event)"
        @dragover="onDragOver(index, $event)"
        @dragleave="onDragLeave"
        @drop="onDrop"
        @dragend="onDragEnd"
      >
        <div
          v-if="dragOverIndex === index && dragIndex !== null && dragIndex > index"
          class="drop-indicator drop-before"
        />
        <AccountCard
          :account="account"
          @copy="handleCopy"
          @delete="handleDelete(account)"
          @edit="handleEdit(account)"
        />
        <div
          v-if="dragOverIndex === index && dragIndex !== null && dragIndex < index"
          class="drop-indicator drop-after"
        />
      </div>
    </div>

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

.settings-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
}

.account-list {
  flex: 1;
  overflow-y: auto;
}

.empty {
  text-align: center;
  color: var(--text-secondary);
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

.account-wrapper {
  position: relative;
  transition: transform 0.15s, opacity 0.15s;
}

.account-wrapper.dragging {
  opacity: 0.4;
}

.account-wrapper.drag-over {
  transform: scale(1.02);
}

.drop-indicator {
  position: absolute;
  left: 8px;
  right: 8px;
  height: 2px;
  background: var(--accent);
  border-radius: 2px;
  z-index: 10;
  pointer-events: none;
}

.drop-before {
  top: -1px;
}

.drop-after {
  bottom: -1px;
}
</style>