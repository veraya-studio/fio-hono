import type { PrismaClient, User } from '../../generated/prisma/client'

export interface CreateUserInput {
  id: string
  email: string
  name: string
  password: string
}

export interface AuthRepository {
  findByEmail: (email: string) => Promise<User | null>
  findById: (id: string) => Promise<User | null>
  create: (input: CreateUserInput) => Promise<User>
}

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    findByEmail: email => prisma.user.findUnique({ where: { email } }),
    findById: id => prisma.user.findUnique({ where: { id } }),
    create: input => prisma.user.create({ data: input }),
  }
}
