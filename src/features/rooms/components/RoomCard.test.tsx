import { vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({ data: { user: { name: 'Admin', email: 'admin@test.com', role: 'ADMIN' } }, status: 'authenticated' }),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  signOut: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/calendars',
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), back: vi.fn() }),
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

vi.mock('@prisma/client', () => ({
  // CalendarProvider and SyncStatus are just string enums used as types
}))

import { RoomCard } from './RoomCard'

const defaultProps = {
  id: 'room-1',
  name: 'Meeting Room A',
  location: 'Building 1, Floor 2',
  capacity: 10,
  equipment: ['Projector', 'Whiteboard'],
  calendar: { id: 'cal-1', name: 'Room Calendar', color: '#10B981' },
  hasDisplay: false,
  displayId: null,
  status: {
    isFree: true,
    currentEvent: null,
    nextEvent: null,
    isEndingSoon: false,
    progressPercent: 0,
  },
  onDelete: vi.fn(),
}

describe('RoomCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders room name', () => {
    render(<RoomCard {...defaultProps} />)
    expect(screen.getByText('Meeting Room A')).toBeInTheDocument()
  })

  it('renders location', () => {
    render(<RoomCard {...defaultProps} />)
    expect(screen.getByText('Building 1, Floor 2')).toBeInTheDocument()
  })

  it('renders capacity', () => {
    render(<RoomCard {...defaultProps} />)
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('renders equipment tags', () => {
    render(<RoomCard {...defaultProps} />)
    expect(screen.getByText('Projector')).toBeInTheDocument()
    expect(screen.getByText('Whiteboard')).toBeInTheDocument()
  })

  it('shows "free" status badge when room is free', () => {
    render(<RoomCard {...defaultProps} />)
    expect(screen.getByText('status.free')).toBeInTheDocument()
  })

  it('shows "busy" status badge when room has current event', () => {
    render(
      <RoomCard
        {...defaultProps}
        status={{
          isFree: false,
          currentEvent: {
            id: 'evt-1',
            title: 'Team Standup',
            startTime: new Date('2025-01-15T09:00:00Z'),
            endTime: new Date('2025-01-15T09:30:00Z'),
          },
          nextEvent: null,
          isEndingSoon: false,
          progressPercent: 50,
        }}
      />
    )
    expect(screen.getByText('status.busy')).toBeInTheDocument()
  })

  it('shows "ending soon" badge when isEndingSoon', () => {
    render(
      <RoomCard
        {...defaultProps}
        status={{
          isFree: false,
          currentEvent: {
            id: 'evt-1',
            title: 'Team Standup',
            startTime: new Date('2025-01-15T09:00:00Z'),
            endTime: new Date('2025-01-15T09:30:00Z'),
          },
          nextEvent: null,
          isEndingSoon: true,
          progressPercent: 90,
        }}
      />
    )
    expect(screen.getByText('status.endingSoon')).toBeInTheDocument()
  })

  it('shows current event title and time when busy', () => {
    render(
      <RoomCard
        {...defaultProps}
        status={{
          isFree: false,
          currentEvent: {
            id: 'evt-1',
            title: 'Team Standup',
            startTime: new Date('2025-01-15T09:00:00Z'),
            endTime: new Date('2025-01-15T09:30:00Z'),
          },
          nextEvent: null,
          isEndingSoon: false,
          progressPercent: 50,
        }}
      />
    )
    expect(screen.getByText('Team Standup')).toBeInTheDocument()
    // Time formatting is locale-dependent; just check the time container exists
    const timeText = screen.getByText(/–/)
    expect(timeText).toBeInTheDocument()
  })

  it('shows progress bar when there is a current event', () => {
    render(
      <RoomCard
        {...defaultProps}
        status={{
          isFree: false,
          currentEvent: {
            id: 'evt-1',
            title: 'Team Standup',
            startTime: new Date('2025-01-15T09:00:00Z'),
            endTime: new Date('2025-01-15T09:30:00Z'),
          },
          nextEvent: null,
          isEndingSoon: false,
          progressPercent: 50,
        }}
      />
    )
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).toBeInTheDocument()
    expect(progressBar).toHaveAttribute('aria-valuenow', '50')
    expect(progressBar).toHaveAttribute('aria-valuemin', '0')
    expect(progressBar).toHaveAttribute('aria-valuemax', '100')
  })

  it('shows next event info', () => {
    render(
      <RoomCard
        {...defaultProps}
        status={{
          isFree: true,
          currentEvent: null,
          nextEvent: {
            id: 'evt-2',
            title: 'Planning Session',
            startTime: new Date('2025-01-15T14:00:00Z'),
            endTime: new Date('2025-01-15T15:00:00Z'),
          },
          isEndingSoon: false,
          progressPercent: 0,
        }}
      />
    )
    // The translation mock returns key:params for the nextEvent call
    const nextEventText = screen.getByText(/nextEvent/)
    expect(nextEventText).toBeInTheDocument()
  })

  it('shows "create display" link when hasDisplay is false', () => {
    render(<RoomCard {...defaultProps} hasDisplay={false} />)
    const createLink = screen.getByText('createDisplay')
    expect(createLink).toBeInTheDocument()
    expect(createLink.closest('a')).toHaveAttribute('href', '/admin/displays/new?roomId=room-1')
  })

  it('shows "view display" link when hasDisplay is true', () => {
    render(<RoomCard {...defaultProps} hasDisplay={true} displayId="display-1" />)
    const viewLink = screen.getByText('viewDisplay')
    expect(viewLink).toBeInTheDocument()
    expect(viewLink.closest('a')).toHaveAttribute('href', '/admin/displays/display-1')
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<RoomCard {...defaultProps} onDelete={onDelete} />)
    const deleteButton = screen.getByLabelText('Delete room')
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith('room-1')
  })
})
