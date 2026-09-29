import { describe, it, expect } from 'vitest'
import { siteIdentityOf } from './site'
import type { Account } from '@/types'

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

describe('siteIdentityOf', () => {
  it('should key two accounts of the same site alike', () => {
    const app = siteIdentityOf(makeAccount({ issuer: 'Microsoft' }))
    const imported = siteIdentityOf(makeAccount({ issuer: 'Microsoft - Microsoft' }))

    expect(imported.key).toBe(app.key)
  })

  it('should drop the account part an importer appends to the issuer', () => {
    const { key, label } = siteIdentityOf(makeAccount({ issuer: 'GitHub - work@example.com' }))

    expect(key).toBe('github')
    expect(label).toBe('GitHub')
  })

  it('should ignore case and surrounding whitespace', () => {
    const { key } = siteIdentityOf(makeAccount({ issuer: '  github  ' }))

    expect(key).toBe('github')
  })

  it('should fall back to the account name when there is no issuer', () => {
    const { key, label } = siteIdentityOf(makeAccount({ issuer: '', name: '火箭+TNT-wugiro' }))

    expect(key).toBe('火箭+tnt-wugiro')
    expect(label).toBe('火箭+TNT-wugiro')
  })

  it('should give an unnamed account a group of its own', () => {
    const { key } = siteIdentityOf(makeAccount({ id: 'lonely', issuer: '', name: '' }))

    expect(key).toBe('lonely')
  })
})
