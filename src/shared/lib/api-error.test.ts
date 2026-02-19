import { vi } from 'vitest'

// Mock NextResponse before importing the module under test
vi.mock('next/server', () => ({
  NextResponse: {
    json: vi.fn((body: unknown, init?: { status?: number }) => ({
      body,
      status: init?.status ?? 200,
    })),
  },
}))

// Mock the authorization module
vi.mock('@/server/middleware/authorization', () => ({
  AuthorizationError: class AuthorizationError extends Error {
    statusCode: number
    code: string
    constructor(message: string, code: string, statusCode: number) {
      super(message)
      this.name = 'AuthorizationError'
      this.code = code
      this.statusCode = statusCode
    }
  },
}))

import { z } from 'zod'
import { ApiError, handleApiError, notFound } from '@/shared/lib/api-error'
import { AuthorizationError } from '@/server/middleware/authorization'

describe('ApiError', () => {
  it('sets code, message, statusCode, and details correctly', () => {
    const error = new ApiError('INVALID_INPUT', 'Bad input', 422, { field: 'email' })
    expect(error.code).toBe('INVALID_INPUT')
    expect(error.message).toBe('Bad input')
    expect(error.statusCode).toBe(422)
    expect(error.details).toEqual({ field: 'email' })
    expect(error.name).toBe('ApiError')
    expect(error).toBeInstanceOf(Error)
  })

  it('defaults statusCode to 400 when not provided', () => {
    const error = new ApiError('SOME_CODE', 'Some message')
    expect(error.statusCode).toBe(400)
    expect(error.details).toBeUndefined()
  })
})

describe('handleApiError', () => {
  it('handles ApiError correctly', () => {
    const error = new ApiError('NOT_FOUND', 'Resource not found', 404, { id: 123 })
    const response = handleApiError(error) as unknown as { body: unknown; status: number }

    expect(response.status).toBe(404)
    expect(response.body).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: 'Resource not found',
        details: { id: 123 },
      },
    })
  })

  it('handles AuthorizationError', () => {
    const error = new AuthorizationError('Forbidden', 'ACCESS_DENIED', 403)
    const response = handleApiError(error) as unknown as { body: unknown; status: number }

    expect(response.status).toBe(403)
    expect(response.body).toEqual({
      error: {
        code: 'ACCESS_DENIED',
        message: 'Forbidden',
      },
    })
  })

  it('handles ZodError with validation details', () => {
    let zodError: z.ZodError
    try {
      z.string().parse(123)
      throw new Error('Expected ZodError')
    } catch (e) {
      zodError = e as z.ZodError
    }

    const response = handleApiError(zodError!) as unknown as { body: unknown; status: number }

    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: zodError!.issues,
      },
    })
  })

  it('handles unknown errors with status 500', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = new Error('Something broke')
    const response = handleApiError(error) as unknown as { body: unknown; status: number }

    expect(response.status).toBe(500)
    expect(response.body).toEqual({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    })
    consoleSpy.mockRestore()
  })
})

describe('notFound', () => {
  it('creates an ApiError with the correct code, message, and 404 status', () => {
    const error = notFound('room')
    expect(error).toBeInstanceOf(ApiError)
    expect(error.code).toBe('ROOM_NOT_FOUND')
    expect(error.message).toBe('room not found')
    expect(error.statusCode).toBe(404)
  })
})
