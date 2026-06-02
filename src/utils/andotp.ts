import type { Account } from '@/types'
import { getRandomBgColor } from '@/utils/icons'

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
      name = name.substring(potentialIssuer.length + 2).trim()
    }
    issuer = potentialIssuer
  } else if (dashIndex > 0) {
    issuer = label.substring(0, dashIndex).trim()
    name = label.substring(dashIndex + 3).trim()
  }

  return { issuer, name }
}

function convertAndOTPAccount(andotp: AndOTPAccount, order: number): Account {
  const { issuer: parsedIssuer, name } = parseAndOTPLabel(andotp.label)

  const issuer = andotp.issuer || parsedIssuer

  // TODO: 映射 thumbnail 到图标
  const displayName = name || issuer || '?'
  const initial = displayName.charAt(0).toUpperCase()
  const icon = {
    type: 'initial' as const,
    value: initial,
    bgColor: getRandomBgColor()
  }

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
    createdAt: Date.now(),
    order
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export function importAndOTPBackup(jsonContent: string): Account[] {
  let andotpAccounts: AndOTPAccount[]

  try {
    andotpAccounts = JSON.parse(jsonContent) as AndOTPAccount[]
  } catch {
    throw new Error('Invalid JSON format')
  }

  if (!Array.isArray(andotpAccounts)) {
    throw new Error('andOTP backup should be a JSON array')
  }

  return andotpAccounts
    .filter(account => account.type === 'TOTP')
    .map((account, index) => convertAndOTPAccount(account, index))
}

export type { AndOTPAccount }
