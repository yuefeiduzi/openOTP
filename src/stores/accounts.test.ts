import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import type { Account } from '@/types'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue(undefined),
}))

import { useAccountStore } from './accounts'

function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'alice@example.com',
    issuer: 'GitHub',
    icon: { type: 'initial', value: 'A', bgColor: '#123456' },
    type: 'totp',
    secret: 'JBSWY3DPEHPK3PXP',
    algorithm: 'sha1',
    digits: 6,
    period: 30,
    counter: 0,
    notes: '',
    createdAt: 1700000000000,
    order: 0,
    ...overrides,
  }
}

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('importAccounts', () => {
  it('should append imported accounts after existing ones', () => {
    const store = useAccountStore()
    store.accounts = [makeAccount({ id: 'existing', order: 0 })]

    store.importAccounts([makeAccount({ id: 'imported', order: 0 })])

    expect(store.accounts).toHaveLength(2)
    expect(store.accounts[1].order).toBe(1)
  })

  it('should assign fresh ids so repeat imports do not collide', () => {
    const store = useAccountStore()
    store.accounts = [makeAccount({ id: 'same-id' })]

    store.importAccounts([makeAccount({ id: 'same-id' })])

    expect(store.accounts[0].id).not.toBe(store.accounts[1].id)
  })

  it('should preserve the incoming order of imported accounts', () => {
    const store = useAccountStore()

    store.importAccounts([
      makeAccount({ id: 'b', name: 'second' }),
      makeAccount({ id: 'c', name: 'first' }),
    ])

    expect(store.accounts.map(a => a.name)).toEqual(['second', 'first'])
    expect(store.accounts[0].order).toBeLessThan(store.accounts[1].order)
  })

  it('should keep secrets intact', () => {
    const store = useAccountStore()

    store.importAccounts([makeAccount({ secret: 'GEZDGNBVGY3TQOJQ' })])

    expect(store.accounts[0].secret).toBe('GEZDGNBVGY3TQOJQ')
  })
})