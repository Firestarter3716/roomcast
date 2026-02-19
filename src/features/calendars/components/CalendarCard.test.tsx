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

import { CalendarCard } from './CalendarCard'

const defaultProps = {
  id: 'cal-1',
  name: 'Office Calendar',
  provider: 'GOOGLE' as const,
  color: '#3B82F6',
  syncStatus: 'IDLE' as const,
  lastSyncAt: new Date('2025-01-15T10:00:00Z'),
  lastSyncError: null,
  syncIntervalSeconds: 300,
  enabled: true,
  eventCount: 42,
  onSync: vi.fn(),
  onDelete: vi.fn(),
}

describe('CalendarCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders calendar name', () => {
    render(<CalendarCard {...defaultProps} />)
    expect(screen.getByText('Office Calendar')).toBeInTheDocument()
  })

  it('renders provider label (translation key)', () => {
    render(<CalendarCard {...defaultProps} />)
    // The useTranslations mock returns the key itself, so providers.GOOGLE
    expect(screen.getByText('providers.GOOGLE')).toBeInTheDocument()
  })

  it('renders event count', () => {
    render(<CalendarCard {...defaultProps} />)
    // The mock returns key:params for parameterized calls
    expect(screen.getByText('events:{"count":42}')).toBeInTheDocument()
  })

  it('shows color indicator with correct color', () => {
    const { container } = render(<CalendarCard {...defaultProps} />)
    const colorIndicator = container.querySelector('div[style]') as HTMLElement
    expect(colorIndicator).toBeTruthy()
    // jsdom normalizes hex+alpha (#3B82F620) to rgba format
    expect(colorIndicator.style.backgroundColor).toBe('rgba(59, 130, 246, 0.125)')
    expect(colorIndicator.style.color).toBe('rgb(59, 130, 246)')
  })

  it('calls onSync when sync button is clicked', () => {
    const onSync = vi.fn()
    render(<CalendarCard {...defaultProps} onSync={onSync} />)
    const syncButton = screen.getByLabelText('Sync calendar')
    fireEvent.click(syncButton)
    expect(onSync).toHaveBeenCalledWith('cal-1')
  })

  it('calls onDelete when delete button is clicked', () => {
    const onDelete = vi.fn()
    render(<CalendarCard {...defaultProps} onDelete={onDelete} />)
    const deleteButton = screen.getByLabelText('Delete calendar')
    fireEvent.click(deleteButton)
    expect(onDelete).toHaveBeenCalledWith('cal-1')
  })

  it('shows error message when syncStatus is ERROR and lastSyncError is set', () => {
    render(
      <CalendarCard
        {...defaultProps}
        syncStatus={'ERROR' as const}
        lastSyncError="Connection timed out"
      />
    )
    expect(screen.getByText('Connection timed out')).toBeInTheDocument()
  })

  it('shows disabled indicator when enabled is false', () => {
    render(<CalendarCard {...defaultProps} enabled={false} />)
    expect(screen.getByText('disabled')).toBeInTheDocument()
  })

  it('has edit link pointing to correct URL', () => {
    render(<CalendarCard {...defaultProps} />)
    const editLink = screen.getByLabelText('Edit calendar')
    expect(editLink).toBeInTheDocument()
    expect(editLink).toHaveAttribute('href', '/admin/calendars/cal-1')
  })
})
