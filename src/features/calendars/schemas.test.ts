import { createCalendarSchema, calendarCredentialsSchema } from '@/features/calendars/schemas'

describe('createCalendarSchema', () => {
  const validExchangeCredentials = {
    provider: 'EXCHANGE' as const,
    tenantId: 'tenant-123',
    clientId: 'client-123',
    clientSecret: 'secret-123',
    userEmail: 'user@example.com',
  }

  const validGoogleCredentials = {
    provider: 'GOOGLE' as const,
    clientId: 'client-123',
    clientSecret: 'secret-123',
    refreshToken: 'refresh-token-123',
    calendarId: 'calendar@group.calendar.google.com',
  }

  const validCaldavCredentials = {
    provider: 'CALDAV' as const,
    serverUrl: 'https://caldav.example.com',
    username: 'user',
    password: 'pass',
  }

  const validIcsCredentials = {
    provider: 'ICS' as const,
    feedUrl: 'https://example.com/feed.ics',
  }

  it('accepts a valid Exchange calendar', () => {
    const input = {
      name: 'Meeting Room A',
      color: '#3B82F6',
      syncIntervalSeconds: 60,
      credentials: validExchangeCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts a valid Google calendar', () => {
    const input = {
      name: 'Team Calendar',
      color: '#22C55E',
      syncIntervalSeconds: 300,
      credentials: validGoogleCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts a valid CalDAV calendar', () => {
    const input = {
      name: 'CalDAV Room',
      color: '#EF4444',
      syncIntervalSeconds: 120,
      credentials: validCaldavCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts a valid ICS calendar', () => {
    const input = {
      name: 'ICS Feed',
      color: '#F59E0B',
      syncIntervalSeconds: 600,
      credentials: validIcsCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const input = {
      name: '',
      color: '#3B82F6',
      syncIntervalSeconds: 60,
      credentials: validExchangeCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects invalid color format', () => {
    const input = {
      name: 'Room',
      color: 'not-a-color',
      syncIntervalSeconds: 60,
      credentials: validExchangeCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects syncIntervalSeconds below 30', () => {
    const input = {
      name: 'Room',
      color: '#3B82F6',
      syncIntervalSeconds: 10,
      credentials: validExchangeCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects syncIntervalSeconds above 86400', () => {
    const input = {
      name: 'Room',
      color: '#3B82F6',
      syncIntervalSeconds: 100000,
      credentials: validExchangeCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('sanitizes name by stripping HTML tags', () => {
    const input = {
      name: '<b>Bold Room</b>',
      color: '#3B82F6',
      syncIntervalSeconds: 60,
      credentials: validExchangeCredentials,
    }
    const result = createCalendarSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).not.toContain('<b>')
      expect(result.data.name).not.toContain('</b>')
    }
  })
})

describe('calendarCredentialsSchema', () => {
  it('rejects Exchange credentials with missing tenantId', () => {
    const input = {
      provider: 'EXCHANGE',
      tenantId: '',
      clientId: 'client-123',
      clientSecret: 'secret-123',
      userEmail: 'user@example.com',
    }
    const result = calendarCredentialsSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects Google credentials with invalid provider value', () => {
    const input = {
      provider: 'INVALID_PROVIDER',
      clientId: 'client-123',
      clientSecret: 'secret-123',
      refreshToken: 'token-123',
      calendarId: 'cal-123',
    }
    const result = calendarCredentialsSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects CalDAV credentials with invalid serverUrl', () => {
    const input = {
      provider: 'CALDAV',
      serverUrl: 'not-a-url',
      username: 'user',
      password: 'pass',
    }
    const result = calendarCredentialsSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('accepts valid ICS credentials with feedUrl', () => {
    const input = {
      provider: 'ICS',
      feedUrl: 'https://example.com/calendar.ics',
    }
    const result = calendarCredentialsSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})
