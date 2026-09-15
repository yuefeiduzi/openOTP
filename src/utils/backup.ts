import type { Account } from '@/types'
import { encryptData, decryptData } from '@/utils/crypto'
import type { EncryptedData } from '@/utils/crypto'

export const BACKUP_VERSION = '2.0.0'

export interface BackupManifest {
  version: string
  appVersion: string
  createdAt: number
  accountCount: number
  /** v2+：false 表示 accounts 字段为明文，true 表示 data 字段为加密载荷 */
  encrypted: boolean
}

interface BackupPayload {
  manifest: BackupManifest
  /** 仅 encrypted === true 时存在 */
  data?: EncryptedData
  /** 仅 encrypted === false 时存在 */
  accounts?: Account[]
}

/**
 * Creates a backup payload. Secrets are always included — an empty password
 * produces a plaintext payload, any other password encrypts the accounts.
 */
export async function createBackup(accounts: Account[], password: string): Promise<string> {
  const encrypted = password.length > 0

  const manifest: BackupManifest = {
    version: BACKUP_VERSION,
    appVersion: '0.1.0',
    createdAt: Math.floor(Date.now() / 1000),
    accountCount: accounts.length,
    encrypted,
  }

  const payload: BackupPayload = encrypted
    ? { manifest, data: await encryptData(JSON.stringify(accounts), password) }
    : { manifest, accounts }

  return JSON.stringify(payload)
}

/**
 * Restores accounts from a backup. The password is ignored for plaintext
 * backups (manifest.encrypted === false).
 */
export async function restoreBackup(
  backupJson: string,
  password: string,
): Promise<{ manifest: BackupManifest; accounts: Account[] }> {
  let payload: BackupPayload
  try {
    payload = JSON.parse(backupJson) as BackupPayload
  } catch {
    throw new Error('Invalid backup file: malformed JSON')
  }

  if (!payload || typeof payload !== 'object' || !payload.manifest) {
    throw new Error('Invalid backup file: missing manifest')
  }

  const validation = validateBackup(payload.manifest)
  if (!validation.valid) {
    throw new Error(`Invalid backup file: ${validation.error}`)
  }

  if (!payload.manifest.encrypted) {
    if (!Array.isArray(payload.accounts)) {
      throw new Error('Invalid backup file: missing accounts')
    }
    return { manifest: payload.manifest, accounts: payload.accounts }
  }

  if (!payload.data) {
    throw new Error('Invalid backup file: missing encrypted data')
  }

  const plaintext = await decryptData(payload.data, password)

  let accounts: Account[]
  try {
    accounts = JSON.parse(plaintext) as Account[]
  } catch {
    throw new Error('Invalid backup file: failed to parse accounts')
  }

  if (!Array.isArray(accounts)) {
    throw new Error('Invalid backup file: failed to parse accounts')
  }

  return { manifest: payload.manifest, accounts }
}

/**
 * Validates a backup manifest. Only v2+ is accepted: v1 backups were written
 * before secrets were included and restoring them yields unusable accounts.
 */
export function validateBackup(manifest: BackupManifest): { valid: boolean; error?: string } {
  if (!manifest || !manifest.version) {
    return { valid: false, error: 'Missing version in manifest' }
  }

  const [major] = manifest.version.split('.').map(Number)
  if (major !== 2) {
    return {
      valid: false,
      error: `Unsupported backup version ${manifest.version} — backups older than 2.0.0 contain no account secrets`,
    }
  }

  if (typeof manifest.encrypted !== 'boolean') {
    return { valid: false, error: 'Missing encrypted flag in manifest' }
  }

  if (typeof manifest.accountCount !== 'number' || manifest.accountCount < 0) {
    return { valid: false, error: 'Invalid account count' }
  }

  return { valid: true }
}