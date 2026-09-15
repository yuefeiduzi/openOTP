import { invoke } from '@tauri-apps/api/core'

export interface EncryptedData {
  /** KDF work factor; absent on payloads written before it was recorded. */
  iterations?: number
  nonce: string
  salt: string
  ciphertext: string
}

export async function encryptData(plaintext: string, password: string): Promise<EncryptedData> {
  return invoke<EncryptedData>('encrypt_data', { plaintext, password })
}

export async function decryptData(encrypted: EncryptedData, password: string): Promise<string> {
  // The Rust command takes the payload as a single `encrypted` argument, so it
  // must be forwarded as an object — flattening it makes Tauri fail to find the
  // argument. Passing it whole also forwards the KDF parameters.
  return invoke<string>('decrypt_data', { encrypted, password })
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function randomHex(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}