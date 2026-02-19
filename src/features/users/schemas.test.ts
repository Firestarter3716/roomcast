import { createUserSchema, updateUserSchema } from '@/features/users/schemas'

describe('createUserSchema', () => {
  it('accepts a valid user', () => {
    const input = {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'securePass123',
      role: 'ADMIN',
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('rejects an invalid email', () => {
    const input = {
      email: 'not-an-email',
      name: 'John Doe',
      password: 'securePass123',
      role: 'ADMIN',
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 characters', () => {
    const input = {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'short',
      role: 'ADMIN',
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects missing name', () => {
    const input = {
      email: 'john@example.com',
      name: '',
      password: 'securePass123',
      role: 'ADMIN',
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('rejects invalid role', () => {
    const input = {
      email: 'john@example.com',
      name: 'John Doe',
      password: 'securePass123',
      role: 'SUPERUSER',
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(false)
  })

  it('sanitizes name by stripping HTML', () => {
    const input = {
      email: 'john@example.com',
      name: '<script>alert("xss")</script>John',
      password: 'securePass123',
      role: 'EDITOR',
    }
    const result = createUserSchema.safeParse(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).not.toContain('<script>')
      expect(result.data.name).not.toContain('</script>')
    }
  })
})

describe('updateUserSchema', () => {
  it('accepts partial update with only email', () => {
    const input = {
      email: 'newemail@example.com',
    }
    const result = updateUserSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts empty password string', () => {
    const input = {
      password: '',
    }
    const result = updateUserSchema.safeParse(input)
    expect(result.success).toBe(true)
  })

  it('accepts empty object since all fields are optional', () => {
    const input = {}
    const result = updateUserSchema.safeParse(input)
    expect(result.success).toBe(true)
  })
})
