import type { PrismaClient as PrismaClientType } from '../generated/prisma/client'
import { PrismaD1 } from '@prisma/adapter-d1'
import { PrismaClient } from '../generated/prisma/client'

export function createPrisma(database: D1Database): PrismaClientType {
  return new PrismaClient({
    adapter: new PrismaD1(database),
  })
}
