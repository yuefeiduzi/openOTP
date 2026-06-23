import type { Account } from '@/types'
import { encryptData, decryptData } from '@/utils/crypto'
import type { EncryptedData } from '@/utils/crypto'

export interface BackupManifest {
  version: string
  appVersion: string
  createdAt: number
  accountCount: number
}

interface BackupPayload {
  manifest: BackupManifest
  data: EncryptedData
}

function stripSecrets(accounts: Account[]): Account[] {
  return accounts.map((account) => {
    const { secret, ...rest } = account
    return rest as Account
  })
}

export async function createBackup(accounts: Account[], password: string): Promise<string> {
  const manifest: BackupManifest = {
    version: '1.0.0',
    appVersion: '0.1.0',
    createdAt: Math.floor(Date.now() / 1000),
    accountCount: accounts.length,
  }

  const accountsWithoutSecrets = stripSecrets(accounts)
  const plaintext = JSON.stringify(accountsWithoutSecrets)
  const encrypted = await encryptData(plaintext, password)

  const payload: BackupPayload = { manifest, data: encrypted }
  return JSON.stringify(payload)
}

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

  if (!payload.manifest || !payload.data) {
    throw new Error('Invalid backup file: missing manifest or data')
  }

  const plaintext = await decryptData(payload.data, password)
  let accounts: Account[]
  try {
    accounts = JSON.parse(plaintext) as Account[]
  } catch {
    throw new Error('Invalid backup file: failed to parse accounts')
  }

  return { manifest: payload.manifest, accounts }
}

export function validateBackup(manifest: BackupManifest): { valid: boolean; error?: string } {
  if (!manifest.version) {
    return { valid: false, error: 'Missing version in manifest' }
  }

  const [major] = manifest.version.split('.').map(Number)
  if (major !== 1) {
    return { valid: false, error: `Unsupported backup version: ${manifest.version}` }
  }

  if (manifest.accountCount < 0) {
    return { valid: false, error: 'Invalid account count' }
  }

  return { valid: true }
}
