import { createRoomSchema } from '@/features/rooms/schemas'

describe('createRoomSchema', () => {
  it('accepts a valid room', () => {
    const input = {
      name: 'Conference Room A',
      calendarId: 'cal-123',
    }
    const result = createRoomSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects missing name', () => {
    const input = {
      name: '',
      calendarId: 'cal-123',
    }
    const result = createRoomSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects missing calendarId', () => {
    const input = {
      name: 'Conference Room A',
      calendarId: '',
    }
    const result = createRoomSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('accepts optional fields (location, capacity)', () => {
    const input = {
      name: 'Conference Room A',
      calendarId: 'cal-123',
      location: 'Building 3, Floor 2',
      capacity: 20,
    }
    const result = createRoomSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.capacity).toBe(20)
    }
  })

  it('sanitizes equipment array entries', () => {
    const input = {
      name: 'Room B',
      calendarId: 'cal-123',
      equipment: ['<b>Projector</b>', 'Whiteboard'],
    }
    const result = createRoomSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.equipment[0]).not.toContain('<b>')
      expect(result.data.equipment[1]).toBe('Whiteboard')
    }
  })

  it('rejects capacity above 10000', () => {
    const input = {
      name: 'Stadium',
      calendarId: 'cal-123',
      capacity: 10001,
    }
    const result = createRoomSchema.safeParse(input)
    expect(result.success).toBe(false)
  })
})
