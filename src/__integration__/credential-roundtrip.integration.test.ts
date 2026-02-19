import { describe, it, expect, beforeAll } from 'vitest'

beforeAll(() => {
  process.env.ENCRYPTION_SECRET = 'test-secret-for-integration-tests-32bytes!'
})

import { encryptProviderCredentials, decryptProviderCredentials } from '@/features/calendars/providers/credential-manager'
import { getProviderAdapter } from '@/features/calendars/providers/provider-factory'

describe('Credential Roundtrip Integration', () => {
  describe('Exchange credentials roundtrip', () => {
    it('encrypts and decrypts Exchange credentials correctly', () => {
      const credentials = {
        tenantId: 'tenant-abc-123',
        clientId: 'client-id-456',
        clientSecret: 'super-secret-value',
        userEmail: 'admin@contoso.com',
        resourceEmail: 'room1@contoso.com',
      }

      const encrypted = encryptProviderCredentials(credentials)
      expect(encrypted).toBeTruthy()
      expect(Buffer.isBuffer(encrypted)).toBe(true)

      const decrypted = decryptProviderCredentials<typeof credentials>(encrypted, 'EXCHANGE')

      expect(decrypted).toEqual(credentials)
      expect(decrypted.tenantId).toBe('tenant-abc-123')
      expect(decrypted.clientId).toBe('client-id-456')
      expect(decrypted.clientSecret).toBe('super-secret-value')
      expect(decrypted.userEmail).toBe('admin@contoso.com')
      expect(decrypted.resourceEmail).toBe('room1@contoso.com')
    })
  })

  describe('Google credentials roundtrip', () => {
    it('encrypts and decrypts Google credentials correctly', () => {
      const credentials = {
        clientId: 'google-client-id.apps.googleusercontent.com',
        clientSecret: 'GOCSPX-secret-value',
        refreshToken: '1//0abc-refresh-token',
        calendarId: 'room-calendar@group.calendar.google.com',
      }

      const encrypted = encryptProviderCredentials(credentials)
      const decrypted = decryptProviderCredentials<typeof credentials>(encrypted, 'GOOGLE')

      expect(decrypted).toEqual(credentials)
      expect(decrypted.clientId).toBe('google-client-id.apps.googleusercontent.com')
      expect(decrypted.refreshToken).toBe('1//0abc-refresh-token')
    })
  })

  describe('CalDAV credentials roundtrip', () => {
    it('encrypts and decrypts CalDAV credentials correctly', () => {
      const credentials = {
        serverUrl: 'https://caldav.example.com/dav',
        username: 'user@example.com',
        password: 'caldav-password-123',
        calendarPath: '/calendars/room-1/',
      }

      const encrypted = encryptProviderCredentials(credentials)
      const decrypted = decryptProviderCredentials<typeof credentials>(encrypted, 'CALDAV')

      expect(decrypted).toEqual(credentials)
      expect(decrypted.serverUrl).toBe('https://caldav.example.com/dav')
      expect(decrypted.calendarPath).toBe('/calendars/room-1/')
    })
  })

  describe('ICS credentials roundtrip', () => {
    it('encrypts and decrypts ICS credentials correctly', () => {
      const credentials = {
        feedUrl: 'https://calendar.example.com/feed/room1.ics',
        authHeader: 'Bearer eyJhbGciOiJIUzI1NiJ9.token',
      }

      const encrypted = encryptProviderCredentials(credentials)
      const decrypted = decryptProviderCredentials<typeof credentials>(encrypted, 'ICS')

      expect(decrypted).toEqual(credentials)
      expect(decrypted.feedUrl).toBe('https://calendar.example.com/feed/room1.ics')
      expect(decrypted.authHeader).toBe('Bearer eyJhbGciOiJIUzI1NiJ9.token')
    })

    it('handles ICS credentials without optional authHeader', () => {
      const credentials = {
        feedUrl: 'https://public-calendar.example.com/feed.ics',
      }

      const encrypted = encryptProviderCredentials(credentials)
      const decrypted = decryptProviderCredentials<typeof credentials>(encrypted, 'ICS')

      expect(decrypted).toEqual(credentials)
      expect(decrypted.feedUrl).toBe('https://public-calendar.example.com/feed.ics')
    })
  })

  describe('Encrypted output is opaque', () => {
    it('encrypted data does not contain plaintext credential values', () => {
      const credentials = {
        clientSecret: 'my-ultra-secret-key',
        password: 'do-not-leak',
      }

      const encrypted = encryptProviderCredentials(credentials)
      const encryptedStr = encrypted.toString('utf8')

      expect(encryptedStr).not.toContain('my-ultra-secret-key')
      expect(encryptedStr).not.toContain('do-not-leak')
    })
  })

  describe('getProviderAdapter', () => {
    it('returns an adapter for EXCHANGE provider', () => {
      const adapter = getProviderAdapter('EXCHANGE')

      expect(adapter).toBeDefined()
      expect(typeof adapter.testConnection).toBe('function')
      expect(typeof adapter.fetchEvents).toBe('function')
    })

    it('returns an adapter for GOOGLE provider', () => {
      const adapter = getProviderAdapter('GOOGLE')

      expect(adapter).toBeDefined()
      expect(typeof adapter.testConnection).toBe('function')
      expect(typeof adapter.fetchEvents).toBe('function')
    })

    it('returns an adapter for CALDAV provider', () => {
      const adapter = getProviderAdapter('CALDAV')

      expect(adapter).toBeDefined()
      expect(typeof adapter.testConnection).toBe('function')
      expect(typeof adapter.fetchEvents).toBe('function')
    })

    it('returns an adapter for ICS provider', () => {
      const adapter = getProviderAdapter('ICS')

      expect(adapter).toBeDefined()
      expect(typeof adapter.testConnection).toBe('function')
      expect(typeof adapter.fetchEvents).toBe('function')
    })

    it('returns different adapter instances for different providers', () => {
      const exchange = getProviderAdapter('EXCHANGE')
      const google = getProviderAdapter('GOOGLE')
      const caldav = getProviderAdapter('CALDAV')
      const ics = getProviderAdapter('ICS')

      expect(exchange.constructor.name).toBe('ExchangeProvider')
      expect(google.constructor.name).toBe('GoogleProvider')
      expect(caldav.constructor.name).toBe('CalDAVProvider')
      expect(ics.constructor.name).toBe('ICSProvider')
    })

    it('throws for unknown provider', () => {
      expect(() =>
        getProviderAdapter('UNKNOWN' as never)
      ).toThrow('Unknown calendar provider: UNKNOWN')
    })
  })
})
