import type { PublicUser } from '../auth/auth.schema'
import type { UsersRepository } from './users.repository'
import type { UpdateUserInput } from './users.schema'
import { AppError } from '../../lib/errors'
import { toPublicUser } from '../auth/auth.service'

export function createUsersService(repository: UsersRepository) {
  async function requireUser(userId: string) {
    const user = await repository.findById(userId)
    if (!user)
      throw new AppError(404, 'User not found', 'USER_NOT_FOUND')

    return user
  }

  return {
    async updateMe(userId: string, input: UpdateUserInput): Promise<PublicUser> {
      await requireUser(userId)
      return toPublicUser(await repository.updateName(userId, input.name.trim()))
    },

    async deleteMe(userId: string): Promise<{ deleted: true }> {
      await requireUser(userId)
      await repository.deleteById(userId)
      return { deleted: true }
    },
  }
}
