import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn().mockResolvedValue('decrypted'),
}))

import { encryptData, decryptData } from './crypto'
import { invoke } from '@tauri-apps/api/core'

const payload = {
  iterations: 100000,
  nonce: 'bm9uY2U=',
  salt: 'c2FsdA==',
  ciphertext: 'Y2lwaGVy',
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('encryptData', () => {
  it('should pass the plaintext and password', async () => {
    await encryptData('secret payload', '123456')

    expect(invoke).toHaveBeenCalledWith('encrypt_data', {
      plaintext: 'secret payload',
      password: '123456',
    })
  })
})

describe('decryptData', () => {
  it('should pass the payload as a single encrypted argument', async () => {
    await decryptData(payload, '123456')

    expect(invoke).toHaveBeenCalledWith('decrypt_data', {
      encrypted: payload,
      password: '123456',
    })
  })

  it('should not flatten the payload fields', async () => {
    await decryptData(payload, '123456')

    const args = vi.mocked(invoke).mock.calls[0][1] as Record<string, unknown>
    expect(args.nonce).toBeUndefined()
    expect(args.salt).toBeUndefined()
    expect(args.ciphertext).toBeUndefined()
  })

  it('should forward the KDF work factor', async () => {
    await decryptData({ ...payload, iterations: 250000 }, '123456')

    const args = vi.mocked(invoke).mock.calls[0][1] as { encrypted: { iterations: number } }
    expect(args.encrypted.iterations).toBe(250000)
  })
})