import { ref } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { Account } from '@/types'

export const useAccountStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])

  async function loadAccounts(): Promise<void> {
    try {
      const saved = await invoke('get_accounts') as Account[]
      accounts.value = saved || []
    } catch {
      accounts.value = []
    }
  }

  function generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 9)
  }

  function addAccount(account: Omit<Account, 'order'> & { order?: number }) {
    if (!account.id) {
      account.id = generateId()
    }
    if (!account.createdAt) {
      account.createdAt = Date.now()
    }
    if (account.order === undefined) {
      const minOrder = accounts.value.length
        ? Math.min(...accounts.value.map(a => a.order))
        : 1
      account.order = minOrder - 1
    }
    const full: Account = { ...account, order: account.order }
    accounts.value.push(full)
    persistAccounts()
  }

  function removeAccount(id: string) {
    const index = accounts.value.findIndex(a => a.id === id)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      // save_account only upserts, so deletion needs its own command to
      // actually drop the entry from data.json.
      invoke('delete_account', { id }).catch(() => {})
    }
  }

  function updateAccount(id: string, updates: Partial<Account>) {
    const account = accounts.value.find(a => a.id === id)
    if (account) {
      Object.assign(account, updates)
      persistAccounts()
    }
  }

  /**
   * Appends imported accounts, always assigning fresh ids to avoid collisions
   * with existing accounts, and preserving the order they arrived in.
   */
  function importAccounts(imported: Account[]) {
    const maxOrder = accounts.value.length
      ? Math.max(...accounts.value.map(a => a.order))
      : -1

    imported.forEach((account, index) => {
      accounts.value.push({
        ...account,
        id: generateId(),
        createdAt: account.createdAt || Date.now(),
        order: maxOrder + 1 + index,
      })
    })

    persistAccounts()
  }

  function reorderAccounts(orderedIds: string[]) {
    let order = 0
    for (const id of orderedIds) {
      const account = accounts.value.find(a => a.id === id)
      if (account) {
        account.order = order++
      }
    }
    persistAccounts()
  }

  async function persistAccounts(): Promise<void> {
    try {
      for (const account of accounts.value) {
        await invoke('save_account', { account })
      }
    } catch {
      // silently fail
    }
  }

  return {
    accounts,
    loadAccounts,
    addAccount,
    removeAccount,
    updateAccount,
    importAccounts,
    reorderAccounts,
    persistAccounts
  }
})
