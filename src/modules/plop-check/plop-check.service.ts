import type { PlopCheckRepository } from './plop-check.repository'
import type { PlopCheckStatus } from './plop-check.schema'

export function createPlopCheckService(repository: PlopCheckRepository) {
  return {
    async status(): Promise<PlopCheckStatus> {
      await repository.ping()
      return {
        module: 'plop-check',
        status: 'ready',
      }
    },
  }
}
