import type { User } from '../../generated/prisma/client'
import type { AuthConfig } from '../../lib/config'
import type { AuthRepository } from './auth.repository'
import type { LoginInput, PublicUser, RegisterInput } from './auth.schema'
import { AppError, isUniqueConstraintError } from '../../lib/errors'
import { hashPassword, verifyPassword } from '../../lib/password'
import { issueAccessToken } from '../../lib/token'

export interface AuthResult {
  user: PublicUser
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export function createAuthService(repository: AuthRepository, config: AuthConfig) {
  async function authenticate(user: User): Promise<AuthResult> {
    const token = await issueAccessToken(user, config)
    return {
      user: toPublicUser(user),
      accessToken: token.accessToken,
      tokenType: 'Bearer',
      expiresIn: token.expiresIn,
    }
  }

  return {
    async register(input: RegisterInput): Promise<AuthResult> {
      const email = input.email.trim().toLowerCase()
      if (await repository.findByEmail(email))
        throw new AppError(409, 'Email is already registered', 'EMAIL_ALREADY_EXISTS')

      const password = await hashPassword(input.password)

      try {
        const user = await repository.create({
          id: crypto.randomUUID(),
          email,
          name: input.name.trim(),
          password,
        })
        return authenticate(user)
      }
      catch (error) {
        if (isUniqueConstraintError(error))
          throw new AppError(409, 'Email is already registered', 'EMAIL_ALREADY_EXISTS')

        throw error
      }
    },

    async login(input: LoginInput): Promise<AuthResult> {
      const user = await repository.findByEmail(input.email.trim().toLowerCase())
      if (!user) {
        throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')
      }

      const validPassword = await verifyPassword(input.password, user.password)
      if (!validPassword)
        throw new AppError(401, 'Invalid email or password', 'INVALID_CREDENTIALS')

      return authenticate(user)
    },

    async me(userId: string): Promise<PublicUser> {
      const user = await repository.findById(userId)
      if (!user)
        throw new AppError(404, 'User not found', 'USER_NOT_FOUND')

      return toPublicUser(user)
    },
  }
}
