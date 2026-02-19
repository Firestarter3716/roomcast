import { describe, it, expect } from 'vitest'
import { requireAuth, requireRole, AuthorizationError } from '@/server/middleware/authorization'
import type { AppSession } from '@/server/middleware/authorization'

function makeSession(role: 'ADMIN' | 'EDITOR' | 'VIEWER'): AppSession {
  return {
    user: {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      role,
    },
  }
}

describe('authorization', () => {
  describe('AuthorizationError', () => {
    it('has correct properties', () => {
      const err = new AuthorizationError('test message', 'TEST_CODE', 418)

      expect(err).toBeInstanceOf(Error)
      expect(err).toBeInstanceOf(AuthorizationError)
      expect(err.message).toBe('test message')
      expect(err.name).toBe('AuthorizationError')
      expect(err.code).toBe('TEST_CODE')
      expect(err.statusCode).toBe(418)
    })
  })

  describe('requireAuth', () => {
    it('throws when session is null', () => {
      expect(() => requireAuth(null)).toThrow(AuthorizationError)
      try {
        requireAuth(null)
      } catch (e) {
        const err = e as AuthorizationError
        expect(err.code).toBe('UNAUTHORIZED')
        expect(err.statusCode).toBe(401)
      }
    })

    it('throws when session.user is undefined', () => {
      const session = {} as AppSession
      expect(() => requireAuth(session)).toThrow(AuthorizationError)
    })

    it('passes when session has a user', () => {
      const session = makeSession('VIEWER')
      expect(() => requireAuth(session)).not.toThrow()
    })
  })

  describe('requireRole', () => {
    it('throws for insufficient role (VIEWER trying ADMIN)', () => {
      const session = makeSession('VIEWER')
      expect(() => requireRole(session, ['ADMIN'])).toThrow(AuthorizationError)
      try {
        requireRole(session, ['ADMIN'])
      } catch (e) {
        const err = e as AuthorizationError
        expect(err.code).toBe('FORBIDDEN')
        expect(err.statusCode).toBe(403)
      }
    })

    it('passes for sufficient role (ADMIN accessing EDITOR)', () => {
      const session = makeSession('ADMIN')
      expect(() => requireRole(session, ['ADMIN', 'EDITOR'])).not.toThrow()
    })

    it('passes for exact role match', () => {
      const session = makeSession('EDITOR')
      expect(() => requireRole(session, ['EDITOR'])).not.toThrow()
    })
  })
})
