import type { Account } from '@/types'

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

const ALGORITHM_MAP: Record<string, string> = {
  sha1: 'SHA-1',
  sha256: 'SHA-256',
  sha512: 'SHA-512',
}

export function base32ToBuffer(base32: string): ArrayBuffer {
  const cleaned = base32.replace(/=+$/, '').replace(/\s/g, '').toUpperCase()

  const bits: number[] = []
  for (const char of cleaned) {
    const val = BASE32_ALPHABET.indexOf(char)
    if (val === -1) {
      throw new Error(`Invalid base32 character: ${char}`)
    }
    for (let i = 4; i >= 0; i--) {
      bits.push((val >> i) & 1)
    }
  }

  const byteCount = Math.floor(bits.length / 8)
  const buffer = new ArrayBuffer(byteCount)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < byteCount; i++) {
    let byte = 0
    for (let j = 0; j < 8; j++) {
      byte = (byte << 1) | bits[i * 8 + j]
    }
    view[i] = byte
  }

  return buffer
}

function counterToBuffer(counter: number): ArrayBuffer {
  const buffer = new ArrayBuffer(8)
  const view = new DataView(buffer)
  view.setBigUint64(0, BigInt(Math.floor(counter)), false)
  return buffer
}

async function hmacSign(key: ArrayBuffer, data: ArrayBuffer, algorithm: string): Promise<ArrayBuffer> {
  const hash = ALGORITHM_MAP[algorithm] || 'SHA-1'
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash },
    false,
    ['sign'],
  )
  return crypto.subtle.sign('HMAC', cryptoKey, data)
}

function dynamicTruncation(hmacResult: ArrayBuffer, digits: number): string {
  const bytes = new Uint8Array(hmacResult)
  const offset = bytes[bytes.length - 1] & 0x0f
  const binary =
    ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff)
  const otp = binary % Math.pow(10, digits)
  return otp.toString().padStart(digits, '0')
}

export async function generateHOTP(
  secret: string,
  counter: number,
  algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1',
  digits: number = 6,
): Promise<string> {
  const key = base32ToBuffer(secret)
  const counterBuf = counterToBuffer(counter)
  const hmac = await hmacSign(key, counterBuf, algorithm)
  return dynamicTruncation(hmac, digits)
}

export async function generateTOTP(
  secret: string,
  algorithm: 'sha1' | 'sha256' | 'sha512' = 'sha1',
  digits: number = 6,
  period: number = 30,
): Promise<string> {
  const timeStep = Math.floor(Date.now() / 1000 / period)
  return generateHOTP(secret, timeStep, algorithm, digits)
}

export function getTOTPRemainingSeconds(period: number = 30): number {
  return period - Math.floor((Date.now() / 1000) % period)
}

export function parseOtpauthUrl(url: string): Partial<Account> {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid otpauth URL: malformed URL')
  }

  if (parsed.protocol !== 'otpauth:') {
    throw new Error('Invalid otpauth URL: unsupported protocol')
  }

  const type = parsed.hostname
  if (type !== 'totp' && type !== 'hotp') {
    throw new Error(`Invalid otpauth URL: unsupported type "${type}"`)
  }

  let label = decodeURIComponent(parsed.pathname.substring(1))
  let name = label
  let issuer = ''

  const colonIndex = label.indexOf(':')
  if (colonIndex > 0) {
    issuer = label.substring(0, colonIndex)
    name = label.substring(colonIndex + 1)
  }

  const params = parsed.searchParams
  const secret = params.get('secret')
  if (!secret) {
    throw new Error('Invalid otpauth URL: missing secret parameter')
  }

  const queryIssuer = params.get('issuer')
  if (queryIssuer) {
    issuer = queryIssuer
  }

  const result: Partial<Account> = {
    type: 'totp',
    secret,
    name: name || issuer || 'Unknown',
    issuer: issuer || '',
  }

  const algo = params.get('algorithm')
  if (algo) {
    const lower = algo.toLowerCase()
    if (lower === 'sha1' || lower === 'sha256' || lower === 'sha512') {
      result.algorithm = lower as 'sha1' | 'sha256' | 'sha512'
    }
  }

  const digitsStr = params.get('digits')
  if (digitsStr) {
    const d = parseInt(digitsStr, 10)
    if (d === 6 || d === 7 || d === 8) {
      result.digits = d
    }
  }

  const periodStr = params.get('period')
  if (periodStr) {
    const p = parseInt(periodStr, 10)
    if (!isNaN(p) && p > 0) {
      result.period = p
    }
  }

  return result
}

export function formatCode(code: string): string {
  if (code.length <= 6) {
    const half = Math.floor(code.length / 2)
    return code.substring(0, half) + ' ' + code.substring(half)
  }
  if (code.length === 7) {
    return code[0] + ' ' + code.substring(1, 4) + ' ' + code.substring(4)
  }
  return code.substring(0, 2) + ' ' + code.substring(2, 5) + ' ' + code.substring(5)
}
