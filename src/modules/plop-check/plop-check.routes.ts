import type { AppEnv } from '../../types'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { errorResponse } from '../../lib/http'
import { createPlopCheckRepository } from './plop-check.repository'
import { PlopCheckStatusResponseSchema } from './plop-check.schema'
import { createPlopCheckService } from './plop-check.service'

const statusRoute = createRoute({
  method: 'get',
  path: '/status',
  tags: ['PlopCheck'],
  summary: 'Check the plop-check module',
  responses: {
    200: {
      description: 'Module is ready',
      content: { 'application/json': { schema: PlopCheckStatusResponseSchema } },
    },
    500: errorResponse('Internal server error'),
  },
})

export function createPlopCheckModule() {
  const app = new OpenAPIHono<AppEnv>()

  app.openapi(statusRoute, async (c) => {
    const service = createPlopCheckService(createPlopCheckRepository(c.get('prisma')))
    const status = await service.status()
    return c.json({ ok: true as const, data: status }, 200)
  })

  return app
}
