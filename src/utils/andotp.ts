import type { Account, AccountIcon } from '@/types'
import { createDefaultIcon } from '@/utils/icons'
import { PRESET_ICONS } from '@/utils/presetIcons'

interface AndOTPAccount {
  secret: string
  issuer: string
  label: string
  digits: 6 | 7 | 8
  type: string
  algorithm: string
  thumbnail: string
  last_used: number
  used_frequency: number
  period: number
  tags: string[]
}

function parseAndOTPLabel(label: string): { issuer: string; name: string } {
  let issuer = ''
  let name = label

  const colonIndex = label.indexOf(':')
  const dashIndex = label.indexOf(' - ')

  if (colonIndex > 0) {
    const potentialIssuer = label.substring(0, colonIndex).trim()
    name = label.substring(colonIndex + 1).trim()
    if (name.startsWith(potentialIssuer + ':') || name.startsWith(potentialIssuer + ' - ')) {
      name = name.substring(potentialIssuer.length + 1).trim()
    }
    issuer = potentialIssuer
  } else if (dashIndex > 0) {
    issuer = label.substring(0, dashIndex).trim()
    name = label.substring(dashIndex + 3).trim()
  }

  return { issuer, name }
}

/**
 * andOTP stores a service name in `thumbnail` and leaves it empty when the
 * user picked a colour. Brands we ship a preset for are matched by name;
 * everything else keeps the generated initial icon.
 */
function iconForThumbnail(thumbnail: string, name: string): AccountIcon {
  const wanted = thumbnail.trim().toLowerCase()
  if (!wanted) {
    return createDefaultIcon(name)
  }

  const preset = PRESET_ICONS.find(icon => icon.name === wanted)
  return preset
    ? { type: 'preset', value: preset.name, bgColor: '' }
    : createDefaultIcon(name)
}

function convertAndOTPAccount(andotp: AndOTPAccount, order: number): Account {
  const { issuer: parsedIssuer, name } = parseAndOTPLabel(andotp.label)

  const issuer = andotp.issuer || parsedIssuer

  const displayName = name || issuer || '?'
  const icon = iconForThumbnail(andotp.thumbnail, displayName)

  return {
    id: generateId(),
    name,
    issuer,
    icon,
    type: 'totp',
    secret: andotp.secret,
    algorithm: andotp.algorithm.toLowerCase() as 'sha1' | 'sha256' | 'sha512',
    digits: andotp.digits,
    period: andotp.period,
    counter: 0,
    notes: '',
    createdAt: Date.now(),
    order
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export interface AndOTPImportResult {
  accounts: Account[]
  /** Entries that were skipped, e.g. counter based HOTP accounts. */
  skipped: number
}

export function importAndOTPBackup(jsonContent: string): AndOTPImportResult {
  let andotpAccounts: AndOTPAccount[]

  try {
    andotpAccounts = JSON.parse(jsonContent) as AndOTPAccount[]
  } catch {
    throw new Error('Invalid JSON format')
  }

  if (!Array.isArray(andotpAccounts)) {
    throw new Error('andOTP backup should be a JSON array')
  }

  const supported = andotpAccounts.filter(account => account.type === 'TOTP')

  return {
    accounts: supported.map((account, index) => convertAndOTPAccount(account, index)),
    skipped: andotpAccounts.length - supported.length,
  }
}

export type { AndOTPAccount }
