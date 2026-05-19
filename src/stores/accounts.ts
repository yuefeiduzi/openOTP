import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type { Account } from '@/types'

export const useAccountStore = defineStore('accounts', () => {
  const accounts = ref<Account[]>([])

  const totpAccounts = computed(() => 
    accounts.value.filter(a => a.type === 'totp').sort((a, b) => a.order - b.order)
  )

  const hotpAccounts = computed(() => 
    accounts.value.filter(a => a.type === 'hotp').sort((a, b) => a.order - b.order)
  )

  function addAccount(account: Account) {
    accounts.value.push(account)
  }

  function removeAccount(id: string) {
    const index = accounts.value.findIndex(a => a.id === id)
    if (index !== -1) {
      accounts.value.splice(index, 1)
    }
  }

  function updateAccount(id: string, updates: Partial<Account>) {
    const account = accounts.value.find(a => a.id === id)
    if (account) {
      Object.assign(account, updates)
    }
  }

  return {
    accounts,
    totpAccounts,
    hotpAccounts,
    addAccount,
    removeAccount,
    updateAccount
  }
})