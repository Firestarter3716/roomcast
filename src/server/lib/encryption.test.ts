import { vi, beforeAll, describe, it, expect } from 'vitest'

beforeAll(() => {
  process.env.ENCRYPTION_SECRET = 'test-secret-for-unit-tests-32bytes!'
})

import { encrypt, decrypt, encryptCredentials, decryptCredentials } from '@/server/lib/encryption'

describe('encryption', () => {
  describe('encrypt', () => {
    it('returns a Buffer', () => {
      const result = encrypt('hello')
      expect(Buffer.isBuffer(result)).toBe(true)
    })

    it('produces different output each time due to random IV', () => {
      const a = encrypt('same-plaintext')
      const b = encrypt('same-plaintext')
      expect(a.equals(b)).toBe(false)
    })
  })

  describe('decrypt', () => {
    it('returns the original plaintext', () => {
      const encrypted = encrypt('hello world')
      const decrypted = decrypt(encrypted)
      expect(decrypted).toBe('hello world')
    })
  })

  describe('encrypt/decrypt roundtrip', () => {
    it('works for a simple string', () => {
      const plaintext = 'The quick brown fox jumps over the lazy dog'
      const result = decrypt(encrypt(plaintext))
      expect(result).toBe(plaintext)
    })

    it('works for a JSON string', () => {
      const json = JSON.stringify({ username: 'admin', password: 's3cret', port: 5432 })
      const result = decrypt(encrypt(json))
      expect(result).toBe(json)
      expect(JSON.parse(result)).toEqual({ username: 'admin', password: 's3cret', port: 5432 })
    })
  })

  describe('decrypt with tampered data', () => {
    it('fails when a byte in the middle is modified', () => {
      const encrypted = encrypt('sensitive data')
      // Tamper with a byte in the encrypted payload (after IV + authTag = 32 bytes)
      const tampered = Buffer.from(encrypted)
      const middleIndex = Math.floor((32 + tampered.length) / 2)
      tampered[middleIndex] = tampered[middleIndex]! ^ 0xff
      expect(() => decrypt(tampered)).toThrow()
    })
  })

  describe('encryptCredentials / decryptCredentials', () => {
    it('roundtrips an object correctly', () => {
      const credentials = {
        host: 'db.example.com',
        port: 5432,
        username: 'admin',
        password: 'super-secret',
        options: { ssl: true },
      }
      const encrypted = encryptCredentials(credentials)
      const decrypted = decryptCredentials(encrypted)
      expect(decrypted).toEqual(credentials)
    })
  })

  describe('getKey', () => {
    it('throws if ENCRYPTION_SECRET is missing', () => {
      const original = process.env.ENCRYPTION_SECRET
      try {
        delete process.env.ENCRYPTION_SECRET
        expect(() => encrypt('anything')).toThrow('ENCRYPTION_SECRET environment variable is required')
      } finally {
        process.env.ENCRYPTION_SECRET = original
      }
    })
  })
})
