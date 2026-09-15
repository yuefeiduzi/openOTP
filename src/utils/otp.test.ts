import { describe, it, expect, vi, afterEach } from 'vitest'
import { parseOtpauthUrl, OtpauthUrlError, generateTOTP, formatCode } from './otp'

/** Reasons are reported so the UI can translate them. */
function reasonFor(url: string): string | undefined {
  try {
    parseOtpauthUrl(url)
    return undefined
  } catch (error) {
    return error instanceof OtpauthUrlError ? error.reason : 'unknown'
  }
}

describe('parseOtpauthUrl', () => {
  it('should read a full totp url', () => {
    const result = parseOtpauthUrl(
      'otpauth://totp/GitHub:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&algorithm=SHA256&digits=8&period=60',
    )

    expect(result).toMatchObject({
      type: 'totp',
      issuer: 'GitHub',
      name: 'alice@example.com',
      secret: 'JBSWY3DPEHPK3PXP',
      algorithm: 'sha256',
      digits: 8,
      period: 60,
    })
  })

  it('should fall back to defaults for optional parameters', () => {
    const result = parseOtpauthUrl('otpauth://totp/acme?secret=JBSWY3DPEHPK3PXP')

    expect(result.name).toBe('acme')
    expect(result.issuer).toBe('')
    expect(result.algorithm).toBeUndefined()
    expect(result.digits).toBeUndefined()
  })

  it('should prefer the issuer parameter over the label prefix', () => {
    const result = parseOtpauthUrl(
      'otpauth://totp/Old:alice?secret=JBSWY3DPEHPK3PXP&issuer=New',
    )

    expect(result.issuer).toBe('New')
    expect(result.name).toBe('alice')
  })

  it('should ignore nonsense algorithm, digit and period values', () => {
    const result = parseOtpauthUrl(
      'otpauth://totp/acme?secret=JBSWY3DPEHPK3PXP&algorithm=md5&digits=4&period=0',
    )

    expect(result.algorithm).toBeUndefined()
    expect(result.digits).toBeUndefined()
    expect(result.period).toBeUndefined()
  })

  it('should refuse hotp accounts instead of generating wrong codes', () => {
    expect(reasonFor('otpauth://hotp/acme?secret=JBSWY3DPEHPK3PXP&counter=0')).toBe('hotpUnsupported')
  })

  it('should report a malformed url', () => {
    expect(reasonFor('not a url')).toBe('malformed')
  })

  it('should report a foreign protocol', () => {
    expect(reasonFor('https://example.com/?secret=JBSWY3DPEHPK3PXP')).toBe('unsupportedProtocol')
  })

  it('should report an unknown type', () => {
    expect(reasonFor('otpauth://steam/acme?secret=JBSWY3DPEHPK3PXP')).toBe('unsupportedType')
  })

  it('should report a missing secret', () => {
    expect(reasonFor('otpauth://totp/acme')).toBe('missingSecret')
  })
})

describe('generateTOTP', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  // RFC 6238 test vector: secret "12345678901234567890" in base32.
  it('should match the RFC 6238 vector', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date(59_000))

    const code = await generateTOTP('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 'sha1', 8, 30)

    expect(code).toBe('94287082')
  })
})

describe('formatCode', () => {
  it('should split six digits in half', () => {
    expect(formatCode('123456')).toBe('123 456')
  })

  it('should format seven digits as 1-3-3', () => {
    expect(formatCode('1234567')).toBe('1 234 567')
  })

  it('should format eight digits as 2-3-3', () => {
    expect(formatCode('12345678')).toBe('12 345 678')
  })
})