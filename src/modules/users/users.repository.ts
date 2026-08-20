import type { PrismaClient, User } from '../../generated/prisma/client'

export interface UsersRepository {
  findById: (id: string) => Promise<User | null>
  updateName: (id: string, name: string) => Promise<User>
  deleteById: (id: string) => Promise<void>
}

export function createUsersRepository(prisma: PrismaClient): UsersRepository {
  return {
    findById: id => prisma.user.findUnique({ where: { id } }),
    updateName: (id, name) =>
      prisma.user.update({ where: { id }, data: { name } }),
    async deleteById(id) {
      await prisma.user.delete({ where: { id } })
    },
  }
}
