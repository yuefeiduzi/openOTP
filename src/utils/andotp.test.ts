import { describe, it, expect } from 'vitest'
import { importAndOTPBackup } from './andotp'
import type { AndOTPAccount } from './andotp'

describe('importAndOTPBackup', () => {
  const validAccounts: AndOTPAccount[] = [
    {
      secret: 'JBSWY3DPEHPK3PXP',
      issuer: 'Microsoft',
      label: 'Microsoft:user@example.com',
      digits: 6,
      type: 'TOTP',
      algorithm: 'SHA1',
      thumbnail: 'Microsoft',
      last_used: 1755768211979,
      used_frequency: 4,
      period: 30,
      tags: [],
    },
    {
      secret: 'MZXW6YTBOJRXAZTG',
      issuer: '',
      label: 'Ubisoft - user@example.com',
      digits: 6,
      type: 'TOTP',
      algorithm: 'SHA1',
      thumbnail: 'Ubisoft',
      last_used: 1574476434268,
      used_frequency: 0,
      period: 30,
      tags: [],
    },
    {
      secret: 'K5XW2Y3DINQW4Z3TOB2GQZTGMY3HKL3VNVXCALD2PJDXW63UFIIA====',
      issuer: 'Epic Games',
      label: 'Epic Games:demo@Epic Games',
      digits: 6,
      type: 'TOTP',
      algorithm: 'SHA1',
      thumbnail: 'EpicGames',
      last_used: 1766127911014,
      used_frequency: 3,
      period: 30,
      tags: [],
    },
    {
      secret: 'ONSWG4TFOQ3WG2LH',
      issuer: 'V2EX',
      label: 'V2EX:@demo',
      digits: 6,
      type: 'TOTP',
      algorithm: 'SHA1',
      thumbnail: 'Default',
      last_used: 1725667302312,
      used_frequency: 10,
      period: 30,
      tags: [],
    },
  ]

  it('should parse valid andOTP JSON array', () => {
    const json = JSON.stringify(validAccounts)
    const result = importAndOTPBackup(json)
    expect(result).toHaveLength(4)
  })

  it('should filter out non-TOTP accounts', () => {
    const accounts = [
      ...validAccounts,
      { ...validAccounts[0], type: 'HOTP' },
    ]
    const json = JSON.stringify(accounts)
    const result = importAndOTPBackup(json)
    expect(result).toHaveLength(4)
  })

  it('should extract issuer from label when issuer is empty', () => {
    const accounts: AndOTPAccount[] = [
      {
        secret: 'TEST12345',
        issuer: '',
        label: 'Ubisoft - user@example.com',
        digits: 6,
        type: 'TOTP',
        algorithm: 'SHA1',
        thumbnail: 'Default',
        last_used: 0,
        used_frequency: 0,
        period: 30,
        tags: [],
      },
    ]
    const json = JSON.stringify(accounts)
    const result = importAndOTPBackup(json)
    expect(result[0].issuer).toBe('Ubisoft')
  })

  it('should prefer issued field over parsed issuer', () => {
    const accounts: AndOTPAccount[] = [
      {
        secret: 'TEST12345',
        issuer: 'Epic Games',
        label: 'Epic Games:demo@Epic Games',
        digits: 6,
        type: 'TOTP',
        algorithm: 'SHA1',
        thumbnail: 'Default',
        last_used: 0,
        used_frequency: 0,
        period: 30,
        tags: [],
      },
    ]
    const json = JSON.stringify(accounts)
    const result = importAndOTPBackup(json)
    expect(result[0].issuer).toBe('Epic Games')
    expect(result[0].name).toBe('demo@Epic Games')
  })

  it('should parse colon-separated label', () => {
    const accounts: AndOTPAccount[] = [
      {
        secret: 'TEST12345',
        issuer: '',
        label: 'V2EX:@demo',
        digits: 6,
        type: 'TOTP',
        algorithm: 'SHA1',
        thumbnail: 'Default',
        last_used: 0,
        used_frequency: 0,
        period: 30,
        tags: [],
      },
    ]
    const json = JSON.stringify(accounts)
    const result = importAndOTPBackup(json)
    expect(result[0].issuer).toBe('V2EX')
    expect(result[0].name).toBe('@demo')
  })

  it('should convert algorithm to lowercase', () => {
    const accounts: AndOTPAccount[] = [
      {
        secret: 'TEST12345',
        issuer: 'Test',
        label: 'Test',
        digits: 6,
        type: 'TOTP',
        algorithm: 'SHA256',
        thumbnail: 'Default',
        last_used: 0,
        used_frequency: 0,
        period: 30,
        tags: [],
      },
    ]
    const json = JSON.stringify(accounts)
    const result = importAndOTPBackup(json)
    expect(result[0].algorithm).toBe('sha256')
  })

  it('should throw on invalid JSON', () => {
    expect(() => importAndOTPBackup('not json'))
      .toThrow('Invalid JSON format')
  })

  it('should throw on non-array JSON', () => {
    expect(() => importAndOTPBackup('{"secret":"test"}'))
      .toThrow('andOTP backup should be a JSON array')
  })

  it('should set default icon for each account', () => {
    const json = JSON.stringify([validAccounts[0]])
    const result = importAndOTPBackup(json)
    expect(result[0].icon.type).toBe('emoji')
    expect(result[0].icon.value).toBe('🔑')
  })

  it('should set correct order for multiple accounts', () => {
    const json = JSON.stringify(validAccounts.slice(0, 3))
    const result = importAndOTPBackup(json)
    expect(result[0].order).toBe(0)
    expect(result[1].order).toBe(1)
    expect(result[2].order).toBe(2)
  })

  it('should set type to totp for all imported accounts', () => {
    const json = JSON.stringify([validAccounts[0]])
    const result = importAndOTPBackup(json)
    expect(result[0].type).toBe('totp')
  })

  it('should generate unique IDs', () => {
    const json = JSON.stringify([validAccounts[0], validAccounts[1]])
    const result = importAndOTPBackup(json)
    expect(result[0].id).not.toBe(result[1].id)
  })
})
