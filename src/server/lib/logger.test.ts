import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// Set LOG_LEVEL to debug so all levels are active during tests
process.env.LOG_LEVEL = 'debug'

// Must import after setting env so the module picks up the level
const { logger } = await import('@/server/lib/logger')

describe('logger', () => {
  let infoSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>
  let warnSpy: ReturnType<typeof vi.spyOn>
  let debugSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('logger.info calls console.info', () => {
    logger.info('test info message')
    expect(infoSpy).toHaveBeenCalledOnce()
  })

  it('logger.error calls console.error', () => {
    logger.error('test error message')
    expect(errorSpy).toHaveBeenCalledOnce()
  })

  it('logger.warn calls console.warn', () => {
    logger.warn('test warn message')
    expect(warnSpy).toHaveBeenCalledOnce()
  })

  it('logger.debug calls console.debug when LOG_LEVEL=debug', () => {
    logger.debug('test debug message')
    expect(debugSpy).toHaveBeenCalledOnce()
  })

  it('log output is valid JSON with timestamp, level, and message', () => {
    logger.info('structured log')
    const output = infoSpy.mock.calls[0]![0] as string
    const parsed = JSON.parse(output)

    expect(parsed).toHaveProperty('timestamp')
    expect(parsed).toHaveProperty('level', 'info')
    expect(parsed).toHaveProperty('message', 'structured log')
    // Verify timestamp is a valid ISO string
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp)
  })

  it('context is included in log output', () => {
    logger.info('with context', { requestId: 'abc-123', userId: 42 })
    const output = infoSpy.mock.calls[0]![0] as string
    const parsed = JSON.parse(output)

    expect(parsed).toHaveProperty('requestId', 'abc-123')
    expect(parsed).toHaveProperty('userId', 42)
    expect(parsed).toHaveProperty('message', 'with context')
  })
})
