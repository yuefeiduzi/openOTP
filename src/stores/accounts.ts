import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { invoke } from '@tauri-apps/api/core'
import type { Account } from '@/types'

export const useAccountStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])

  const totpAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'totp').sort((a, b) => a.order - b.order)
  )

  const hotpAccounts = computed(() =>
    accounts.value.filter(a => a.type === 'hotp').sort((a, b) => a.order - b.order)
  )

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

  function addAccount(account: Account) {
    if (!account.id) {
      account.id = generateId()
    }
    if (!account.createdAt) {
      account.createdAt = Date.now()
    }
    if (account.order === undefined) {
      account.order = accounts.value.length
    }
    accounts.value.push(account)
    persistAccounts()
  }

  function removeAccount(id: string) {
    const index = accounts.value.findIndex(a => a.id === id)
    if (index !== -1) {
      accounts.value.splice(index, 1)
      persistAccounts()
    }
  }

  function updateAccount(id: string, updates: Partial<Account>) {
    const account = accounts.value.find(a => a.id === id)
    if (account) {
      Object.assign(account, updates)
      persistAccounts()
    }
  }

  async function persistAccounts(): Promise<void> {
    try {
      await invoke('save_account', { account: accounts.value })
    } catch {
      // silently fail
    }
  }

  return {
    accounts,
    totpAccounts,
    hotpAccounts,
    loadAccounts,
    addAccount,
    removeAccount,
    updateAccount,
    persistAccounts
  }
})