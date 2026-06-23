import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Account } from '@/types'

vi.mock('@/utils/crypto', () => ({
  encryptData: vi.fn(),
  decryptData: vi.fn(),
}))

import { createBackup, restoreBackup, validateBackup } from './backup'
import { encryptData, decryptData } from '@/utils/crypto'
import type { BackupManifest } from './backup'

const mockAccount: Account = {
  id: 'test1',
  name: 'test@example.com',
  issuer: 'Test',
  icon: { type: 'emoji', value: '🔑', bgColor: '' },
  type: 'totp',
  secret: 'JBSWY3DPEHPK3PXP',
  algorithm: 'sha1',
  digits: 6,
  period: 30,
  counter: 0,
  notes: '',
  createdAt: 1700000000000,
  order: 0,
}

const mockEncrypted = {
  nonce: 'abc123',
  salt: 'def456',
  ciphertext: 'encrypted-data',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('validateBackup', () => {
  it('should validate a correct manifest', () => {
    const manifest: BackupManifest = {
      version: '1.0.0',
      appVersion: '0.1.0',
      createdAt: 1700000000,
      accountCount: 5,
    }
    expect(validateBackup(manifest)).toEqual({ valid: true })
  })

  it('should reject missing version', () => {
    const manifest = { appVersion: '0.1.0', createdAt: 0, accountCount: 0, version: '' } as BackupManifest
    const result = validateBackup(manifest)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Missing version in manifest')
  })

  it('should reject unsupported major version', () => {
    const manifest: BackupManifest = {
      version: '2.0.0',
      appVersion: '0.1.0',
      createdAt: 0,
      accountCount: 0,
    }
    const result = validateBackup(manifest)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported backup version')
  })

  it('should reject negative account count', () => {
    const manifest: BackupManifest = {
      version: '1.0.0',
      appVersion: '0.1.0',
      createdAt: 0,
      accountCount: -1,
    }
    const result = validateBackup(manifest)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid account count')
  })

  it('should accept version 1.x.x', () => {
    const manifest: BackupManifest = {
      version: '1.5.2',
      appVersion: '0.1.0',
      createdAt: 0,
      accountCount: 3,
    }
    expect(validateBackup(manifest)).toEqual({ valid: true })
  })
})

describe('createBackup', () => {
  it('should create backup with correct manifest', async () => {
    vi.mocked(encryptData).mockResolvedValue(mockEncrypted)

    const json = await createBackup([mockAccount], 'password123')
    const payload = JSON.parse(json)

    expect(payload.manifest.version).toBe('1.0.0')
    expect(payload.manifest.appVersion).toBe('0.1.0')
    expect(payload.manifest.accountCount).toBe(1)
    expect(payload.data).toEqual(mockEncrypted)
  })

  it('should strip secrets from accounts', async () => {
    vi.mocked(encryptData).mockResolvedValue(mockEncrypted)

    await createBackup([mockAccount], 'password123')

    const encryptedCall = vi.mocked(encryptData).mock.calls[0]
    const plaintext = JSON.parse(encryptedCall[0])
    expect(plaintext[0].secret).toBeUndefined()
    expect(plaintext[0].name).toBe('test@example.com')
  })

  it('should handle multiple accounts', async () => {
    vi.mocked(encryptData).mockResolvedValue(mockEncrypted)

    const accounts = [mockAccount, { ...mockAccount, id: 'test2', name: 'second@example.com' }]
    const json = await createBackup(accounts, 'pass')
    const payload = JSON.parse(json)

    expect(payload.manifest.accountCount).toBe(2)
  })

  it('should handle empty accounts array', async () => {
    vi.mocked(encryptData).mockResolvedValue(mockEncrypted)

    const json = await createBackup([], 'pass')
    const payload = JSON.parse(json)

    expect(payload.manifest.accountCount).toBe(0)
  })
})

describe('restoreBackup', () => {
  it('should restore backup correctly', async () => {
    const accounts = [{ name: 'test', issuer: 'Test', type: 'totp', secret: 'JBSWY3DPEHPK3PXP', algorithm: 'sha1', digits: 6, period: 30, icon: { type: 'emoji', value: '🔑', bgColor: '' }, createdAt: 1700000000000, order: 0, counter: 0, notes: '', id: 'test1' }]
    vi.mocked(decryptData).mockResolvedValue(JSON.stringify(accounts))

    const payload = {
      manifest: { version: '1.0.0', appVersion: '0.1.0', createdAt: 0, accountCount: 1 },
      data: mockEncrypted,
    }
    const json = JSON.stringify(payload)

    const result = await restoreBackup(json, 'password123')
    expect(result.manifest.accountCount).toBe(1)
    expect(result.accounts).toHaveLength(1)
    expect(result.accounts[0].name).toBe('test')
  })

  it('should throw on malformed JSON', async () => {
    await expect(restoreBackup('not json', 'pass'))
      .rejects.toThrow('Invalid backup file: malformed JSON')
  })

  it('should throw on missing manifest', async () => {
    const json = JSON.stringify({ data: mockEncrypted })
    await expect(restoreBackup(json, 'pass'))
      .rejects.toThrow('Invalid backup file: missing manifest or data')
  })

  it('should throw on missing data', async () => {
    const json = JSON.stringify({ manifest: { version: '1.0.0', appVersion: '0.1.0', createdAt: 0, accountCount: 0 } })
    await expect(restoreBackup(json, 'pass'))
      .rejects.toThrow('Invalid backup file: missing manifest or data')
  })

  it('should throw when decrypted data is not valid accounts JSON', async () => {
    vi.mocked(decryptData).mockResolvedValue('not valid json')

    const payload = {
      manifest: { version: '1.0.0', appVersion: '0.1.0', createdAt: 0, accountCount: 0 },
      data: mockEncrypted,
    }
    const json = JSON.stringify(payload)

    await expect(restoreBackup(json, 'pass'))
      .rejects.toThrow('Invalid backup file: failed to parse accounts')
  })
})
