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
  // Role is just a string enum used as a type
}))

vi.mock('../actions', () => ({
  deleteUser: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock('@/shared/components/ConfirmDialog', () => ({
  ConfirmDialog: ({ open, onConfirm, title, description }: {
    open: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => void
    title: string
    description: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: string
  }) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        <span>{description}</span>
        <button onClick={onConfirm}>Confirm</button>
      </div>
    ) : null,
}))

import { UserList } from './UserList'

const mockUsers = [
  { id: 'u1', email: 'admin@test.com', name: 'Admin User', role: 'ADMIN' as const, lastLoginAt: new Date('2025-01-15'), createdAt: new Date('2025-01-01') },
  { id: 'u2', email: 'viewer@test.com', name: 'Viewer User', role: 'VIEWER' as const, lastLoginAt: null, createdAt: new Date('2025-01-10') },
]

describe('UserList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders all user names in table', () => {
    render(<UserList users={mockUsers} />)
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('Viewer User')).toBeInTheDocument()
  })

  it('renders all user emails', () => {
    render(<UserList users={mockUsers} />)
    expect(screen.getByText('admin@test.com')).toBeInTheDocument()
    expect(screen.getByText('viewer@test.com')).toBeInTheDocument()
  })

  it('renders role badges', () => {
    render(<UserList users={mockUsers} />)
    expect(screen.getByText('ADMIN')).toBeInTheDocument()
    expect(screen.getByText('VIEWER')).toBeInTheDocument()
  })

  it('shows "Never" for users with no last login', () => {
    render(<UserList users={mockUsers} />)
    expect(screen.getByText('Never')).toBeInTheDocument()
  })

  it('shows empty state when users array is empty', () => {
    render(<UserList users={[]} />)
    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByText(/No users created yet/)).toBeInTheDocument()
  })

  it('has edit links for each user', () => {
    render(<UserList users={mockUsers} />)
    const editLinks = screen.getAllByText('Edit')
    expect(editLinks).toHaveLength(2)
    expect(editLinks[0].closest('a')).toHaveAttribute('href', '/admin/settings/users/u1')
    expect(editLinks[1].closest('a')).toHaveAttribute('href', '/admin/settings/users/u2')
  })

  it('has delete buttons for each user', () => {
    render(<UserList users={mockUsers} />)
    const deleteButtons = screen.getAllByText('Delete')
    expect(deleteButtons).toHaveLength(2)
    expect(deleteButtons[0].tagName).toBe('BUTTON')
    expect(deleteButtons[1].tagName).toBe('BUTTON')
  })
})
