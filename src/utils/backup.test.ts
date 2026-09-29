import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Account } from '@/types'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue({}),
}))

import { exportBackup, inspectBackup, importBackup, MIN_BACKUP_PASSWORD_LENGTH } from './backup'
import { invoke } from '@tauri-apps/api/core'

const account: Account = {
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
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('exportBackup', () => {
  it('should pass the path, accounts and password to the backend', async () => {
    await exportBackup('/tmp/backup.zip', [account], 'password123')

    expect(invoke).toHaveBeenCalledWith('export_backup', {
      path: '/tmp/backup.zip',
      accounts: [account],
      password: 'password123',
    })
  })

  it('should pass null for an unencrypted backup', async () => {
    await exportBackup('/tmp/backup.zip', [account], null)

    const args = vi.mocked(invoke).mock.calls[0][1] as { password: unknown }
    expect(args.password).toBeNull()
  })
})

describe('inspectBackup', () => {
  it('should be callable without a password', async () => {
    await inspectBackup('/tmp/backup.zip')

    expect(invoke).toHaveBeenCalledWith('inspect_backup', { path: '/tmp/backup.zip' })
  })
})

describe('importBackup', () => {
  it('should pass the path and password', async () => {
    await importBackup('/tmp/backup.zip', 'password123')

    expect(invoke).toHaveBeenCalledWith('import_backup', {
      path: '/tmp/backup.zip',
      password: 'password123',
    })
  })

  it('should pass null for an unencrypted backup', async () => {
    await importBackup('/tmp/backup.zip', null)

    const args = vi.mocked(invoke).mock.calls[0][1] as { password: unknown }
    expect(args.password).toBeNull()
  })
})

describe('MIN_BACKUP_PASSWORD_LENGTH', () => {
  it('should not fall back to a 6-digit pin, which zip AES cannot protect', () => {
    expect(MIN_BACKUP_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8)
  })
})
