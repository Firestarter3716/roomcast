import { vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))

import { HealthDashboard } from './HealthDashboard'

const mockHealthData = {
  calendarCount: 5,
  eventCount: 123,
  displayCount: 3,
  sseConnections: 2,
  dbStatus: { connected: true, responseTimeMs: 12 },
  syncStatuses: [
    { name: 'Office Calendar', status: 'IDLE', lastSyncAt: new Date().toISOString(), error: null },
    { name: 'Room Calendar', status: 'ERROR', lastSyncAt: null, error: 'Connection timeout' },
  ],
}

describe('HealthDashboard', () => {
  describe('stat cards', () => {
    it('renders all stat values', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('123')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('renders stat card labels via translation keys', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('calendars')).toBeInTheDocument()
      expect(screen.getByText('events')).toBeInTheDocument()
      expect(screen.getByText('displays')).toBeInTheDocument()
      expect(screen.getByText('sseConnections')).toBeInTheDocument()
    })
  })

  describe('database status', () => {
    it('shows connected status when database is connected', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('connected')).toBeInTheDocument()
      expect(screen.getByText('database')).toBeInTheDocument()
    })

    it('shows response time when connected', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('responseTime:{"ms":12}')).toBeInTheDocument()
    })

    it('shows disconnected status when database is not connected', () => {
      const disconnectedData = {
        ...mockHealthData,
        dbStatus: { connected: false, responseTimeMs: 0 },
      }
      render(<HealthDashboard healthData={disconnectedData} />)

      expect(screen.getByText('disconnected')).toBeInTheDocument()
    })

    it('does not show response time when disconnected', () => {
      const disconnectedData = {
        ...mockHealthData,
        dbStatus: { connected: false, responseTimeMs: 0 },
      }
      render(<HealthDashboard healthData={disconnectedData} />)

      expect(screen.queryByText(/responseTime/)).not.toBeInTheDocument()
    })
  })

  describe('sync status table', () => {
    it('renders the sync status table heading', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('calendarSyncStatus')).toBeInTheDocument()
    })

    it('renders table column headers', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('syncName')).toBeInTheDocument()
      expect(screen.getByText('syncStatus')).toBeInTheDocument()
      expect(screen.getByText('lastSync')).toBeInTheDocument()
      expect(screen.getByText('syncError')).toBeInTheDocument()
    })

    it('renders calendar names in table rows', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('Office Calendar')).toBeInTheDocument()
      expect(screen.getByText('Room Calendar')).toBeInTheDocument()
    })

    it('renders status badges for each calendar', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('Idle')).toBeInTheDocument()
      expect(screen.getByText('Error')).toBeInTheDocument()
    })

    it('shows error text for calendars with errors', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('Connection timeout')).toBeInTheDocument()
    })

    it('shows em dash for calendars without errors', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('\u2014')).toBeInTheDocument()
    })

    it('shows "Never" for calendars that never synced', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      expect(screen.getByText('Never')).toBeInTheDocument()
    })

    it('shows relative time for calendars that have synced', () => {
      render(<HealthDashboard healthData={mockHealthData} />)

      // The Office Calendar has lastSyncAt set to now, so it should show "Just now"
      expect(screen.getByText('Just now')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('shows empty state message when no sync statuses', () => {
      const emptyData = {
        ...mockHealthData,
        syncStatuses: [],
      }
      render(<HealthDashboard healthData={emptyData} />)

      expect(screen.getByText('noCalendars')).toBeInTheDocument()
    })

    it('does not show sync table when there are no sync statuses', () => {
      const emptyData = {
        ...mockHealthData,
        syncStatuses: [],
      }
      render(<HealthDashboard healthData={emptyData} />)

      expect(screen.queryByText('calendarSyncStatus')).not.toBeInTheDocument()
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('renders empty state with status role', () => {
      const emptyData = {
        ...mockHealthData,
        syncStatuses: [],
      }
      render(<HealthDashboard healthData={emptyData} />)

      expect(screen.getByRole('status')).toBeInTheDocument()
    })
  })
})
