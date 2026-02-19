import { describe, it, expect, afterEach, vi } from 'vitest'
import { sseRegistry } from '@/server/sse/registry'

function createMockController() {
  const chunks: Uint8Array[] = []
  return {
    controller: {
      enqueue: vi.fn((chunk: Uint8Array) => chunks.push(chunk)),
      close: vi.fn(),
      error: vi.fn(),
      desiredSize: 1,
    } as unknown as ReadableStreamDefaultController,
    chunks,
  }
}

function createClient(overrides: Partial<{
  id: string
  displayId: string
  calendarIds: string[]
  controller: ReadableStreamDefaultController
}> = {}) {
  const { controller } = createMockController()
  return {
    id: overrides.id ?? crypto.randomUUID(),
    displayId: overrides.displayId ?? 'display-1',
    calendarIds: overrides.calendarIds ?? ['cal-1'],
    controller: overrides.controller ?? controller,
    connectedAt: new Date(),
    lastHeartbeat: new Date(),
  }
}

// Track all registered client IDs so afterEach can clean up
const registeredIds: string[] = []

function registerClient(overrides: Parameters<typeof createClient>[0] = {}) {
  const client = createClient(overrides)
  sseRegistry.register(client)
  registeredIds.push(client.id)
  return client
}

afterEach(() => {
  for (const id of registeredIds) {
    sseRegistry.unregister(id)
  }
  registeredIds.length = 0
})

describe('SSE Registry Integration', () => {
  describe('Client lifecycle', () => {
    it('register a client increases active count to 1', () => {
      registerClient({ id: 'client-1' })

      expect(sseRegistry.getActiveCount()).toBe(1)
    })

    it('register multiple clients returns correct count', () => {
      registerClient({ id: 'client-a' })
      registerClient({ id: 'client-b' })
      registerClient({ id: 'client-c' })

      expect(sseRegistry.getActiveCount()).toBe(3)
    })

    it('unregister a client decreases the count', () => {
      registerClient({ id: 'client-x' })
      registerClient({ id: 'client-y' })

      expect(sseRegistry.getActiveCount()).toBe(2)

      sseRegistry.unregister('client-x')
      // Remove from tracking so afterEach does not double-unregister
      registeredIds.splice(registeredIds.indexOf('client-x'), 1)

      expect(sseRegistry.getActiveCount()).toBe(1)
    })

    it('unregister non-existent client does not throw', () => {
      expect(() => sseRegistry.unregister('does-not-exist')).not.toThrow()
    })
  })

  describe('Client lookup', () => {
    it('getClientsByCalendarId returns matching clients', () => {
      registerClient({ id: 'c1', calendarIds: ['cal-A', 'cal-B'] })
      registerClient({ id: 'c2', calendarIds: ['cal-B', 'cal-C'] })
      registerClient({ id: 'c3', calendarIds: ['cal-C'] })

      const matches = sseRegistry.getClientsByCalendarId('cal-B')
      const matchIds = matches.map((c) => c.id).sort()

      expect(matchIds).toEqual(['c1', 'c2'])
    })

    it('getClientsByCalendarId returns empty for unknown calendar', () => {
      registerClient({ id: 'c4', calendarIds: ['cal-known'] })

      const matches = sseRegistry.getClientsByCalendarId('cal-unknown')

      expect(matches).toEqual([])
    })

    it('getClientsByDisplayId returns matching clients', () => {
      registerClient({ id: 'd1', displayId: 'display-alpha' })
      registerClient({ id: 'd2', displayId: 'display-alpha' })
      registerClient({ id: 'd3', displayId: 'display-beta' })

      const matches = sseRegistry.getClientsByDisplayId('display-alpha')
      const matchIds = matches.map((c) => c.id).sort()

      expect(matchIds).toEqual(['d1', 'd2'])
    })
  })

  describe('Notifications', () => {
    it('notifyCalendarUpdate sends SSE data to matching clients', () => {
      const mock1 = createMockController()
      const mock2 = createMockController()

      registerClient({ id: 'n1', calendarIds: ['cal-notify'], controller: mock1.controller })
      registerClient({ id: 'n2', calendarIds: ['cal-notify'], controller: mock2.controller })

      const events = [{ id: 'evt-1', title: 'Meeting' }]
      sseRegistry.notifyCalendarUpdate('cal-notify', events)

      // Both controllers should have been called
      expect(mock1.controller.enqueue).toHaveBeenCalledTimes(1)
      expect(mock2.controller.enqueue).toHaveBeenCalledTimes(1)

      // Decode the sent data and verify structure
      const decoder = new TextDecoder()
      const sent1 = decoder.decode(mock1.chunks[0])
      expect(sent1).toMatch(/^data: /)
      expect(sent1).toMatch(/\n\n$/)

      const jsonStr = sent1.replace(/^data: /, '').trim()
      const parsed = JSON.parse(jsonStr)
      expect(parsed.type).toBe('calendar_update')
      expect(parsed.calendarId).toBe('cal-notify')
      expect(parsed.events).toEqual(events)
    })

    it('notifyCalendarUpdate does not send to non-matching clients', () => {
      const mockMatching = createMockController()
      const mockNonMatching = createMockController()

      registerClient({ id: 'n3', calendarIds: ['cal-target'], controller: mockMatching.controller })
      registerClient({ id: 'n4', calendarIds: ['cal-other'], controller: mockNonMatching.controller })

      sseRegistry.notifyCalendarUpdate('cal-target', [])

      expect(mockMatching.controller.enqueue).toHaveBeenCalledTimes(1)
      expect(mockNonMatching.controller.enqueue).not.toHaveBeenCalled()
    })

    it('notifyDisplayConfigUpdate sends to matching display clients', () => {
      const mockMatch = createMockController()
      const mockOther = createMockController()

      registerClient({ id: 'dc1', displayId: 'disp-1', controller: mockMatch.controller })
      registerClient({ id: 'dc2', displayId: 'disp-2', controller: mockOther.controller })

      const config = { theme: 'dark', refreshInterval: 60 }
      sseRegistry.notifyDisplayConfigUpdate('disp-1', config)

      expect(mockMatch.controller.enqueue).toHaveBeenCalledTimes(1)
      expect(mockOther.controller.enqueue).not.toHaveBeenCalled()

      const decoder = new TextDecoder()
      const sent = decoder.decode(mockMatch.chunks[0])
      const jsonStr = sent.replace(/^data: /, '').trim()
      const parsed = JSON.parse(jsonStr)
      expect(parsed.type).toBe('config_update')
      expect(parsed.config).toEqual(config)
    })

    it('notification data is valid JSON with correct type field', () => {
      const mock = createMockController()
      registerClient({ id: 'json-check', calendarIds: ['cal-json'], controller: mock.controller })

      sseRegistry.notifyCalendarUpdate('cal-json', [{ id: '1' }])

      const decoder = new TextDecoder()
      const raw = decoder.decode(mock.chunks[0])
      const jsonStr = raw.replace(/^data: /, '').trim()

      expect(() => JSON.parse(jsonStr)).not.toThrow()
      const parsed = JSON.parse(jsonStr)
      expect(parsed).toHaveProperty('type')
      expect(typeof parsed.type).toBe('string')
    })
  })

  describe('Error handling', () => {
    it('client with throwing controller gets auto-unregistered on notify', () => {
      const throwingController = {
        enqueue: vi.fn(() => {
          throw new Error('Connection closed')
        }),
        close: vi.fn(),
        error: vi.fn(),
        desiredSize: 1,
      } as unknown as ReadableStreamDefaultController

      registerClient({ id: 'err-client', calendarIds: ['cal-err'], controller: throwingController })

      expect(sseRegistry.getActiveCount()).toBe(1)

      // This should not throw, and should auto-unregister the broken client
      expect(() => sseRegistry.notifyCalendarUpdate('cal-err', [])).not.toThrow()

      expect(sseRegistry.getActiveCount()).toBe(0)

      // Remove from tracking since it was auto-unregistered
      registeredIds.splice(registeredIds.indexOf('err-client'), 1)
    })
  })

  describe('Status', () => {
    it('getStatus returns correct structure with activeConnections, displays, clients', () => {
      registerClient({ id: 'st-1', displayId: 'disp-A' })
      registerClient({ id: 'st-2', displayId: 'disp-A' })
      registerClient({ id: 'st-3', displayId: 'disp-B' })

      const status = sseRegistry.getStatus()

      expect(status.activeConnections).toBe(3)
      expect(status.displays).toBe(2)
      expect(status.clients).toHaveLength(3)

      // Each client entry should have the expected shape
      for (const client of status.clients) {
        expect(client).toHaveProperty('id')
        expect(client).toHaveProperty('displayId')
        expect(client).toHaveProperty('connectedAt')
        expect(client).toHaveProperty('lastHeartbeat')
      }

      const clientIds = status.clients.map((c) => c.id).sort()
      expect(clientIds).toEqual(['st-1', 'st-2', 'st-3'])
    })

    it('getStatus returns empty state when no clients are registered', () => {
      const status = sseRegistry.getStatus()

      expect(status.activeConnections).toBe(0)
      expect(status.displays).toBe(0)
      expect(status.clients).toEqual([])
    })
  })
})
