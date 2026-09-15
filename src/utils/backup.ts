import { invoke } from '@tauri-apps/api/core'
import type { Account } from '@/types'

/** Minimum length for an encrypted backup password. */
export const MIN_BACKUP_PASSWORD_LENGTH = 8

export interface BackupManifest {
  format: string
  formatVersion: number
  appVersion: string
  createdAt: number
  accountCount: number
  encrypted: boolean
}

export interface ImportResult {
  manifest: BackupManifest
  accounts: Account[]
}

/**
 * Writes a zip backup containing `manifest.json`, `accounts.json` and one file
 * per uploaded icon. `password` encrypts the account data; pass null to write
 * an unencrypted archive.
 */
export async function exportBackup(
  path: string,
  accounts: Account[],
  password: string | null,
): Promise<BackupManifest> {
  return invoke<BackupManifest>('export_backup', { path, accounts, password })
}

/** Reads a backup's manifest without needing its password. */
export async function inspectBackup(path: string): Promise<BackupManifest> {
  return invoke<BackupManifest>('inspect_backup', { path })
}

/** Restores the accounts contained in a backup. */
export async function importBackup(path: string, password: string | null): Promise<ImportResult> {
  return invoke<ImportResult>('import_backup', { path, password })
}