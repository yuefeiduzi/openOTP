import { ref, computed } from 'vue'
import type { Account } from '@/types'
import { useAccountStore } from '@/stores'
import { getRandomBgColor } from '@/utils/icons'

/**
 * Shared add / edit / delete wiring for the account list.
 *
 * Home and PopoverView both render `AccountCodeList`, which only emits intents;
 * this composable owns the modal state and the store mutations behind them.
 */
export function useAccountEditor() {
  const accountStore = useAccountStore()

  const showAdd = ref(false)
  const showDelete = ref(false)
  const showEdit = ref(false)
  const deletingAccount = ref<Account | null>(null)
  const editingAccount = ref<Account | null>(null)

  /** True while any account modal is open (used to pin the menu bar popover). */
  const isModalOpen = computed(() => showAdd.value || showDelete.value || showEdit.value)

  function openAdd() {
    showAdd.value = true
  }

  function closeAdd() {
    showAdd.value = false
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

  function handleEdit(account: Account) {
    editingAccount.value = account
    showEdit.value = true
  }

  function closeEdit() {
    showEdit.value = false
    editingAccount.value = null
  }

  function handleEditSave(data: Partial<Account>) {
    if (editingAccount.value) {
      accountStore.updateAccount(editingAccount.value.id, data)
    }
    closeEdit()
  }

  function handleDelete(account: Account) {
    deletingAccount.value = account
    showDelete.value = true
  }

  function closeDelete() {
    showDelete.value = false
    deletingAccount.value = null
  }

  function confirmDelete() {
    if (deletingAccount.value) {
      accountStore.removeAccount(deletingAccount.value.id)
    }
    closeDelete()
  }

  return {
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
  }
}
