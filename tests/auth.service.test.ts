import type { User } from '../src/generated/prisma/client'
import type { AuthRepository } from '../src/modules/auth/auth.repository'
import { describe, expect, it } from 'bun:test'
import { hashPassword } from '../src/lib/password'
import { createAuthService } from '../src/modules/auth/auth.service'

const config = {
  secret: 'unit-test-secret-with-at-least-32-bytes',
  issuer: 'test-issuer',
  audience: 'test-audience',
  ttlSeconds: 3600,
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 'f31ea6fa-932b-4fa6-9f4c-21ae06b45110',
    email: 'user@example.com',
    name: 'User',
    password: '',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

describe('auth service', () => {
  it('normalizes email when registering', async () => {
    let createdEmail = ''
    const repository: AuthRepository = {
      findByEmail: async () => null,
      findById: async () => null,
      create: async (input) => {
        createdEmail = input.email
        return user({ ...input })
      },
    }

    const result = await createAuthService(repository, config).register({
      email: '  User@Example.COM  ',
      name: 'User',
      password: 'strong-password',
    })

    expect(createdEmail).toBe('user@example.com')
    expect(result.user.email).toBe('user@example.com')
  }, 15_000)

  it('rejects a duplicate email', async () => {
    const repository: AuthRepository = {
      findByEmail: async () => user(),
      findById: async () => null,
      create: async () => user(),
    }

    await expect(createAuthService(repository, config).register({
      email: 'user@example.com',
      name: 'User',
      password: 'strong-password',
    })).rejects.toEqual(expect.objectContaining({
      status: 409,
      code: 'EMAIL_ALREADY_EXISTS',
    }))
  })

  it('accepts the correct password and rejects a wrong one', async () => {
    const password = await hashPassword('strong-password')
    const storedUser = user({
      password,
    })
    const repository: AuthRepository = {
      findByEmail: async () => storedUser,
      findById: async () => storedUser,
      create: async () => storedUser,
    }
    const service = createAuthService(repository, config)

    await expect(service.login({ email: storedUser.email, password: 'strong-password' })).resolves.toMatchObject({
      tokenType: 'Bearer',
      user: { id: storedUser.id },
    })
    await expect(service.login({ email: storedUser.email, password: 'wrong-password' })).rejects.toEqual(
      expect.objectContaining({ status: 401, code: 'INVALID_CREDENTIALS' }),
    )
  }, 15_000)
})
