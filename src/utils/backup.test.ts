import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Account } from '@/types'

vi.mock('@/utils/crypto', () => ({
  encryptData: vi.fn(),
  decryptData: vi.fn(),
}))

import { createBackup, restoreBackup, validateBackup, BACKUP_VERSION } from './backup'
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

const encryptedManifest: BackupManifest = {
  version: BACKUP_VERSION,
  appVersion: '0.1.0',
  createdAt: 1700000000,
  accountCount: 1,
  encrypted: true,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('validateBackup', () => {
  it('should validate a correct manifest', () => {
    expect(validateBackup(encryptedManifest)).toEqual({ valid: true })
  })

  it('should accept a plaintext manifest', () => {
    expect(validateBackup({ ...encryptedManifest, encrypted: false })).toEqual({ valid: true })
  })

  it('should reject missing version', () => {
    const manifest = { ...encryptedManifest, version: '' }
    const result = validateBackup(manifest)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Missing version in manifest')
  })

  it('should reject v1 backups with a hint about missing secrets', () => {
    const manifest = { ...encryptedManifest, version: '1.0.0' }
    const result = validateBackup(manifest)
    expect(result.valid).toBe(false)
    expect(result.error).toContain('Unsupported backup version')
    expect(result.error).toContain('no account secrets')
  })

  it('should reject a missing encrypted flag', () => {
    const manifest = { version: BACKUP_VERSION, appVersion: '0.1.0', createdAt: 0, accountCount: 0 }
    const result = validateBackup(manifest as BackupManifest)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Missing encrypted flag in manifest')
  })

  it('should reject negative account count', () => {
    const manifest = { ...encryptedManifest, accountCount: -1 }
    const result = validateBackup(manifest)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Invalid account count')
  })
})

describe('createBackup', () => {
  it('should write a v2 manifest', async () => {
    vi.mocked(encryptData).mockResolvedValue(mockEncrypted)

    const json = await createBackup([mockAccount], 'password123')
    const payload = JSON.parse(json)

    expect(payload.manifest.version).toBe('2.0.0')
    expect(payload.manifest.appVersion).toBe('0.1.0')
    expect(payload.manifest.accountCount).toBe(1)
    expect(payload.manifest.encrypted).toBe(true)
    expect(payload.data).toEqual(mockEncrypted)
  })

  it('should keep account secrets', async () => {
    vi.mocked(encryptData).mockResolvedValue(mockEncrypted)

    await createBackup([mockAccount], 'password123')

    const plaintext = JSON.parse(vi.mocked(encryptData).mock.calls[0][0])
    expect(plaintext[0].secret).toBe('JBSWY3DPEHPK3PXP')
    expect(plaintext[0].name).toBe('test@example.com')
  })

  it('should write accounts inline when no password is given', async () => {
    const json = await createBackup([mockAccount], '')
    const payload = JSON.parse(json)

    expect(encryptData).not.toHaveBeenCalled()
    expect(payload.manifest.encrypted).toBe(false)
    expect(payload.accounts[0].secret).toBe('JBSWY3DPEHPK3PXP')
    expect(payload.data).toBeUndefined()
  })

  it('should round-trip through restoreBackup in plaintext mode', async () => {
    const json = await createBackup([mockAccount], '')
    const { accounts } = await restoreBackup(json, '')

    expect(accounts).toHaveLength(1)
    expect(accounts[0].secret).toBe('JBSWY3DPEHPK3PXP')
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
  it('should restore an encrypted backup', async () => {
    vi.mocked(decryptData).mockResolvedValue(JSON.stringify([mockAccount]))

    const json = JSON.stringify({ manifest: encryptedManifest, data: mockEncrypted })
    const result = await restoreBackup(json, 'password123')

    expect(result.manifest.accountCount).toBe(1)
    expect(result.accounts[0].name).toBe('test@example.com')
    expect(result.accounts[0].secret).toBe('JBSWY3DPEHPK3PXP')
  })

  it('should not call decryptData for a plaintext backup', async () => {
    const manifest = { ...encryptedManifest, encrypted: false }
    const json = JSON.stringify({ manifest, accounts: [mockAccount] })
    const result = await restoreBackup(json, '')

    expect(decryptData).not.toHaveBeenCalled()
    expect(result.accounts[0].secret).toBe('JBSWY3DPEHPK3PXP')
  })

  it('should reject a v1 backup', async () => {
    const json = JSON.stringify({
      manifest: { version: '1.0.0', appVersion: '0.1.0', createdAt: 0, accountCount: 1 },
      data: mockEncrypted,
    })
    await expect(restoreBackup(json, 'pass')).rejects.toThrow('Unsupported backup version')
  })

  it('should throw on malformed JSON', async () => {
    await expect(restoreBackup('not json', 'pass'))
      .rejects.toThrow('Invalid backup file: malformed JSON')
  })

  it('should throw on missing manifest', async () => {
    const json = JSON.stringify({ data: mockEncrypted })
    await expect(restoreBackup(json, 'pass'))
      .rejects.toThrow('Invalid backup file: missing manifest')
  })

  it('should throw when encrypted data is missing', async () => {
    const json = JSON.stringify({ manifest: encryptedManifest })
    await expect(restoreBackup(json, 'pass'))
      .rejects.toThrow('Invalid backup file: missing encrypted data')
  })

  it('should throw when plaintext accounts are missing', async () => {
    const json = JSON.stringify({ manifest: { ...encryptedManifest, encrypted: false } })
    await expect(restoreBackup(json, 'pass'))
      .rejects.toThrow('Invalid backup file: missing accounts')
  })

  it('should throw when decrypted data is not valid accounts JSON', async () => {
    vi.mocked(decryptData).mockResolvedValue('not valid json')

    const json = JSON.stringify({ manifest: encryptedManifest, data: mockEncrypted })
    await expect(restoreBackup(json, 'pass'))
      .rejects.toThrow('Invalid backup file: failed to parse accounts')
  })
})