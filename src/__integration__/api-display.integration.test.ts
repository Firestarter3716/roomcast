import { describe, it, expect, beforeAll } from 'vitest'

const BASE_URL = 'http://localhost:3000'
const CRON_SECRET =
  process.env.CRON_SECRET || 'W5ResGRDjdEbCeiTJ4MUNu0TZMFMUqE1QgrrrUTTCb0='

/**
 * Authenticate with NextAuth credentials provider and return
 * a cookie string that can be passed in subsequent requests.
 */
async function getAuthCookies(): Promise<string> {
  // Step 1: Get CSRF token
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const csrfCookies = csrfRes.headers.getSetCookie()
  const { csrfToken } = await csrfRes.json()

  // Step 2: Sign in with credentials
  const signInRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: csrfCookies.join('; '),
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'admin@roomcast.local',
      password: 'changeme',
      redirect: 'false',
      json: 'true',
    }),
    redirect: 'manual',
  })

  // Collect all cookies from both responses
  const allCookies = [...csrfCookies, ...signInRes.headers.getSetCookie()]
  return allCookies.join('; ')
}

/**
 * Helper: authenticated POST request with JSON body.
 */
function authPostJson(path: string, cookies: string, body?: unknown) {
  return fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      Cookie: cookies,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('Display & Sync API integration tests', { timeout: 30_000 }, () => {
  let cookies: string

  beforeAll(async () => {
    cookies = await getAuthCookies()
    expect(cookies).toBeTruthy()
    expect(cookies.length).toBeGreaterThan(0)
  })

  // ─── Display Poll endpoint ────────────────────────────────────────

  describe('GET /api/display/[token]/events/poll', () => {
    it('returns 404 for a nonexistent display token', async () => {
      const res = await fetch(
        `${BASE_URL}/api/display/nonexistent-token/events/poll`,
      )
      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.error).toBe('Display not found')
    })
  })

  // ─── Cron Sync endpoint ───────────────────────────────────────────

  describe('POST /api/sync/cron', () => {
    it('returns 401 when no authorization header is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/sync/cron`, {
        method: 'POST',
      })
      expect(res.status).toBe(401)

      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns 401 when the wrong secret is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/sync/cron`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer wrong-secret-value',
        },
      })
      expect(res.status).toBe(401)

      const body = await res.json()
      expect(body.error).toBe('Unauthorized')
    })

    it('returns success when the correct secret is provided', async () => {
      const res = await fetch(`${BASE_URL}/api/sync/cron`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${CRON_SECRET}`,
        },
      })
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
    })
  })

  // ─── Calendar Sync endpoint (authenticated) ──────────────────────

  describe('POST /api/calendars/[id]/sync', () => {
    it('returns an error for a nonexistent calendar ID', async () => {
      const res = await authPostJson(
        '/api/calendars/nonexistent-id/sync',
        cookies,
      )

      // The server action throws "Calendar not found", which is caught by
      // handleApiError and returned as a 500 internal error.
      expect(res.status).toBeGreaterThanOrEqual(400)

      const body = await res.json()
      expect(body.error).toBeDefined()
    })
  })

  // ─── Calendar Test endpoint (authenticated) ──────────────────────

  describe('POST /api/calendars/[id]/test', () => {
    it('returns 401 without authentication', async () => {
      const res = await fetch(
        `${BASE_URL}/api/calendars/nonexistent-id/test`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        },
      )
      expect(res.status).toBe(401)

      const body = await res.json()
      expect(body.error).toBeDefined()
    })
  })

  // ─── Unauthenticated access to calendar endpoints ─────────────────

  describe('Unauthenticated access', () => {
    it('POST /api/calendars/fake-id/sync without cookies returns 401', async () => {
      const res = await fetch(`${BASE_URL}/api/calendars/fake-id/sync`, {
        method: 'POST',
      })
      expect(res.status).toBe(401)

      const body = await res.json()
      expect(body.error).toBeDefined()
    })
  })
})
