import { cn, formatDateLocale, formatTimeLocale, generateToken, sleep } from '@/shared/lib/utils'

describe('cn', () => {
  it('merges Tailwind classes correctly', () => {
    const result = cn('px-2 py-1', 'px-4')
    expect(result).toContain('px-4')
    expect(result).toContain('py-1')
    expect(result).not.toContain('px-2')
  })

  it('handles conditional classes', () => {
    const result = cn('base', false && 'hidden', 'extra')
    expect(result).toBe('base extra')
  })

  it('handles empty inputs', () => {
    expect(cn()).toBe('')
    expect(cn('')).toBe('')
    expect(cn(undefined)).toBe('')
  })
})

describe('formatDateLocale', () => {
  it('formats a date with locale', () => {
    const date = new Date('2025-03-15T12:00:00Z')
    const result = formatDateLocale(date, 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    expect(result).toContain('March')
    expect(result).toContain('15')
    expect(result).toContain('2025')
  })
})

describe('formatTimeLocale', () => {
  it('formats time in 24-hour format by default', () => {
    // Use a fixed date and format in UTC to avoid timezone issues
    const date = new Date('2025-03-15T14:30:00Z')
    const result = formatTimeLocale(date, 'en-GB', true)
    // The result should be a HH:MM formatted string with the minutes being 30
    expect(result).toMatch(/^\d{2}:\d{2}$/)
    expect(result).toContain('30')
    // Should NOT contain AM/PM indicators
    expect(result).not.toMatch(/AM|PM/i)
  })

  it('formats time in 12-hour format', () => {
    const date = new Date('2025-03-15T14:30:00Z')
    const result = formatTimeLocale(date, 'en-US', false)
    // Should contain minutes and an AM/PM indicator
    expect(result).toContain('30')
    expect(result).toMatch(/AM|PM/i)
  })
})

describe('generateToken', () => {
  it('returns a string of reasonable length', () => {
    const token = generateToken()
    expect(typeof token).toBe('string')
    expect(token.length).toBeGreaterThan(10)
  })

  it('returns unique values on each call', () => {
    const token1 = generateToken()
    const token2 = generateToken()
    expect(token1).not.toBe(token2)
  })
})

describe('sleep', () => {
  it('resolves after the specified delay', async () => {
    vi.useFakeTimers()
    const promise = sleep(50)
    vi.advanceTimersByTime(50)
    await promise
    vi.useRealTimers()
  })

  it('returns a promise', () => {
    const result = sleep(10)
    expect(result).toBeInstanceOf(Promise)
  })
})
