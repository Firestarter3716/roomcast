import { describe, it, expect, beforeAll, afterAll } from 'vitest'

const BASE_URL = 'http://localhost:3000'

/**
 * Parse raw Set-Cookie headers into a deduplicated map of name=value pairs.
 * When the same cookie name appears more than once (e.g. NextAuth sets the
 * CSRF token twice during the initial handshake), only the last value is kept.
 */
function parseCookies(setCookieHeaders: string[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const raw of setCookieHeaders) {
    // "name=value; Path=/; HttpOnly" -> "name=value"
    const nameValue = raw.split(';')[0]
    const name = nameValue.split('=')[0]
    map.set(name, nameValue)
  }
  return map
}

/**
 * Build a Cookie header string from a map of name=value pairs.
 */
function cookieString(map: Map<string, string>): string {
  return [...map.values()].join('; ')
}

/**
 * Authenticate with the NextAuth credentials provider and return
 * a cookie string that can be sent in subsequent requests.
 */
async function getAuthCookies(): Promise<string> {
  // Step 1: Get CSRF token and associated cookies
  const csrfRes = await fetch(`${BASE_URL}/api/auth/csrf`)
  const csrfCookieMap = parseCookies(csrfRes.headers.getSetCookie())
  const { csrfToken } = await csrfRes.json()

  // Step 2: Sign in with credentials
  const signInRes = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieString(csrfCookieMap),
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

  // Merge cookies from both responses (sign-in adds the session token)
  const signInCookieMap = parseCookies(signInRes.headers.getSetCookie())
  const merged = new Map([...csrfCookieMap, ...signInCookieMap])
  return cookieString(merged)
}

/**
 * Helper: authenticated GET request.
 */
function authGet(path: string, cookies: string) {
  return fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: cookies },
  })
}

/**
 * Helper: authenticated request with a JSON body.
 */
function authJson(
  path: string,
  cookies: string,
  method: 'POST' | 'PUT' | 'DELETE',
  body?: unknown,
) {
  return fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Cookie: cookies,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

describe('Admin API integration tests', { timeout: 30_000 }, () => {
  let cookies: string

  // ID of the test user created during the Users test suite.
  // Used for cleanup in afterAll if the delete test did not run or failed.
  let testUserId: string | null = null

  beforeAll(async () => {
    cookies = await getAuthCookies()
    // Verify we received a session cookie
    expect(cookies).toBeTruthy()
    expect(cookies).toContain('authjs.session-token=')
  })

  afterAll(async () => {
    // Clean up: delete the test user if it still exists
    if (testUserId) {
      try {
        await authJson(`/api/admin/users/${testUserId}`, cookies, 'DELETE')
      } catch {
        // Ignore cleanup errors
      }
    }
  })

  // ─── Health endpoint ───────────────────────────────────────────────

  describe('GET /api/admin/health', () => {
    it('returns healthy status with database info and counts', async () => {
      const res = await authGet('/api/admin/health', cookies)
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.status).toBe('healthy')

      // Database connectivity
      expect(body.database).toBeDefined()
      expect(body.database.connected).toBe(true)
      expect(typeof body.database.responseTimeMs).toBe('number')

      // Entity counts (non-negative numbers)
      expect(typeof body.calendars).toBe('number')
      expect(body.calendars).toBeGreaterThanOrEqual(0)
      expect(typeof body.events).toBe('number')
      expect(body.events).toBeGreaterThanOrEqual(0)
      expect(typeof body.displays).toBe('number')
      expect(body.displays).toBeGreaterThanOrEqual(0)
    })
  })

  // ─── Settings endpoints ────────────────────────────────────────────

  describe('Settings API', () => {
    let originalLocale: string

    it('GET /api/admin/settings returns settings with expected fields', async () => {
      const res = await authGet('/api/admin/settings', cookies)
      expect(res.status).toBe(200)

      const { data } = await res.json()
      expect(data).toBeDefined()
      expect(data).toHaveProperty('defaultLocale')
      expect(data).toHaveProperty('defaultTimezone')
      expect(data).toHaveProperty('defaultFont')
      expect(data).toHaveProperty('sessionTimeoutHours')

      // Remember current value so we can restore it later
      originalLocale = data.defaultLocale
    })

    it('PUT /api/admin/settings updates and returns settings', async () => {
      const res = await authJson('/api/admin/settings', cookies, 'PUT', {
        defaultLocale: 'en',
      })
      expect(res.status).toBe(200)

      const { data } = await res.json()
      expect(data).toBeDefined()
      expect(data.defaultLocale).toBe('en')
    })

    it('PUT /api/admin/settings restores original locale', async () => {
      const locale = originalLocale ?? 'de'
      const res = await authJson('/api/admin/settings', cookies, 'PUT', {
        defaultLocale: locale,
      })
      expect(res.status).toBe(200)

      const { data } = await res.json()
      expect(data.defaultLocale).toBe(locale)
    })
  })

  // ─── Users endpoints ──────────────────────────────────────────────

  describe('Users API', () => {
    it('GET /api/admin/users returns an array of users with at least 1 admin', async () => {
      const res = await authGet('/api/admin/users', cookies)
      expect(res.status).toBe(200)

      const { data } = await res.json()
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThanOrEqual(1)

      // At least one ADMIN user must exist (the seeded admin)
      const admins = data.filter((u: { role: string }) => u.role === 'ADMIN')
      expect(admins.length).toBeGreaterThanOrEqual(1)
    })

    it('POST /api/admin/users creates a new user and returns 201', async () => {
      const res = await authJson('/api/admin/users', cookies, 'POST', {
        email: 'test-integration@test.com',
        name: 'Test User',
        password: 'testpass123',
        role: 'VIEWER',
      })
      expect(res.status).toBe(201)

      const { data } = await res.json()
      expect(data).toBeDefined()
      expect(data.email).toBe('test-integration@test.com')
      expect(data.name).toBe('Test User')
      expect(data.role).toBe('VIEWER')
      expect(data.id).toBeDefined()

      // Store the ID for subsequent tests and cleanup
      testUserId = data.id
    })

    it('GET /api/admin/users/[id] returns the created user', async () => {
      expect(testUserId).toBeTruthy()

      const res = await authGet(`/api/admin/users/${testUserId}`, cookies)
      expect(res.status).toBe(200)

      const { data } = await res.json()
      expect(data.id).toBe(testUserId)
      expect(data.email).toBe('test-integration@test.com')
      expect(data.name).toBe('Test User')
      expect(data.role).toBe('VIEWER')
    })

    it('PUT /api/admin/users/[id] updates the user', async () => {
      expect(testUserId).toBeTruthy()

      const res = await authJson(
        `/api/admin/users/${testUserId}`,
        cookies,
        'PUT',
        { name: 'Updated User' },
      )
      expect(res.status).toBe(200)

      const { data } = await res.json()
      expect(data.name).toBe('Updated User')
    })

    it('DELETE /api/admin/users/[id] deletes the user', async () => {
      expect(testUserId).toBeTruthy()

      const res = await authJson(
        `/api/admin/users/${testUserId}`,
        cookies,
        'DELETE',
      )
      expect(res.status).toBe(200)

      const body = await res.json()
      expect(body.success).toBe(true)
    })

    it('GET /api/admin/users/[id] returns 404 after deletion', async () => {
      expect(testUserId).toBeTruthy()

      const res = await authGet(`/api/admin/users/${testUserId}`, cookies)
      expect(res.status).toBe(404)

      const body = await res.json()
      expect(body.error).toBeDefined()

      // User was successfully deleted; no cleanup needed
      testUserId = null
    })
  })

  // ─── Audit endpoint ───────────────────────────────────────────────

  describe('GET /api/admin/audit', () => {
    it('returns audit logs with pagination info', async () => {
      const res = await authGet('/api/admin/audit', cookies)
      expect(res.status).toBe(200)

      const { data } = await res.json()
      expect(data).toBeDefined()
      expect(Array.isArray(data.logs)).toBe(true)
      expect(typeof data.total).toBe('number')
      expect(typeof data.page).toBe('number')
      expect(typeof data.perPage).toBe('number')
      expect(typeof data.totalPages).toBe('number')
    })

    it('contains audit entries from user creation and deletion', async () => {
      const res = await authGet(
        '/api/admin/audit?entityType=User',
        cookies,
      )
      expect(res.status).toBe(200)

      const { data } = await res.json()
      const actions = data.logs.map((l: { action: string }) => l.action)

      // The user CRUD tests above should have generated CREATE, UPDATE, DELETE logs
      expect(actions).toContain('CREATE')
      expect(actions).toContain('DELETE')
    })
  })

  // ─── Unauthenticated access ───────────────────────────────────────

  describe('Unauthenticated access', () => {
    it('GET /api/admin/health without cookies is rejected', async () => {
      // NextAuth authorized callback redirects unauthenticated requests
      // to the login page with a 307 status rather than returning 401.
      const res = await fetch(`${BASE_URL}/api/admin/health`, {
        redirect: 'manual',
      })
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })

    it('GET /api/admin/users without cookies is rejected', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/users`, {
        redirect: 'manual',
      })
      expect(res.status).toBe(307)
      expect(res.headers.get('location')).toContain('/login')
    })
  })
})
