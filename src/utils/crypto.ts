import { invoke } from '@tauri-apps/api/core'

export interface EncryptedData {
  nonce: string
  salt: string
  ciphertext: string
}

export async function encryptData(plaintext: string, password: string): Promise<EncryptedData> {
  return invoke<EncryptedData>('encrypt_data', { plaintext, password })
}

export async function decryptData(encrypted: EncryptedData, password: string): Promise<string> {
  return invoke<string>('decrypt_data', {
    nonce: encrypted.nonce,
    salt: encrypted.salt,
    ciphertext: encrypted.ciphertext,
    password,
  })
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function randomHex(length: number): string {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}
