import type { PrismaClient } from '../../generated/prisma/client'

export interface PlopCheckRepository {
  ping: () => Promise<void>
}

export function createPlopCheckRepository(prisma: PrismaClient): PlopCheckRepository {
  return {
    async ping() {
      await prisma.$queryRaw`SELECT 1`
    },
  }
}
