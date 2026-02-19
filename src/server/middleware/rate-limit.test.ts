import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { rateLimit } from '@/server/middleware/rate-limit'

describe('rateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows the first request', () => {
    const result = rateLimit('test-first', 5, 60_000)
    expect(result.allowed).toBe(true)
  })

  it('allows requests within the limit', () => {
    const key = 'test-within-limit'
    const limit = 3

    const r1 = rateLimit(key, limit, 60_000)
    const r2 = rateLimit(key, limit, 60_000)
    const r3 = rateLimit(key, limit, 60_000)

    expect(r1.allowed).toBe(true)
    expect(r2.allowed).toBe(true)
    expect(r3.allowed).toBe(true)
  })

  it('blocks requests exceeding the limit', () => {
    const key = 'test-exceed'
    const limit = 2

    rateLimit(key, limit, 60_000)
    rateLimit(key, limit, 60_000)
    const blocked = rateLimit(key, limit, 60_000)

    expect(blocked.allowed).toBe(false)
    expect(blocked.remaining).toBe(0)
  })

  it('resets after the window expires', () => {
    const key = 'test-reset'
    const limit = 1
    const windowMs = 10_000

    const r1 = rateLimit(key, limit, windowMs)
    expect(r1.allowed).toBe(true)

    const r2 = rateLimit(key, limit, windowMs)
    expect(r2.allowed).toBe(false)

    // Advance time past the window
    vi.advanceTimersByTime(windowMs + 1)

    const r3 = rateLimit(key, limit, windowMs)
    expect(r3.allowed).toBe(true)
  })

  it('tracks different keys separately', () => {
    const limit = 1
    const windowMs = 60_000

    const a1 = rateLimit('key-a', limit, windowMs)
    const b1 = rateLimit('key-b', limit, windowMs)

    expect(a1.allowed).toBe(true)
    expect(b1.allowed).toBe(true)

    // Both keys are now at their limit
    const a2 = rateLimit('key-a', limit, windowMs)
    const b2 = rateLimit('key-b', limit, windowMs)

    expect(a2.allowed).toBe(false)
    expect(b2.allowed).toBe(false)
  })

  it('decreases remaining count correctly', () => {
    const key = 'test-remaining'
    const limit = 5
    const windowMs = 60_000

    const r1 = rateLimit(key, limit, windowMs)
    expect(r1.remaining).toBe(4)

    const r2 = rateLimit(key, limit, windowMs)
    expect(r2.remaining).toBe(3)

    const r3 = rateLimit(key, limit, windowMs)
    expect(r3.remaining).toBe(2)

    const r4 = rateLimit(key, limit, windowMs)
    expect(r4.remaining).toBe(1)

    const r5 = rateLimit(key, limit, windowMs)
    expect(r5.remaining).toBe(0)

    // Over the limit
    const r6 = rateLimit(key, limit, windowMs)
    expect(r6.remaining).toBe(0)
    expect(r6.allowed).toBe(false)
  })
})
