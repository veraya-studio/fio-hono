import type { AppEnv } from '../../types'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { errorResponse } from '../../lib/http'
import { requireAuth } from '../../middleware/auth'
import { UserResponseSchema } from '../auth/auth.schema'
import { createUsersRepository } from './users.repository'
import { DeleteUserResponseSchema, UpdateUserSchema } from './users.schema'
import { createUsersService } from './users.service'

const updateMeRoute = createRoute({
  method: 'patch',
  path: '/me',
  tags: ['Users'],
  summary: 'Update the authenticated user name',
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  request: {
    body: {
      required: true,
      content: {
        'application/json': { schema: UpdateUserSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated user',
      content: { 'application/json': { schema: UserResponseSchema } },
    },
    400: errorResponse('Invalid request'),
    401: errorResponse('Unauthorized'),
    404: errorResponse('User not found'),
    500: errorResponse('Internal server error'),
  },
})

const deleteMeRoute = createRoute({
  method: 'delete',
  path: '/me',
  tags: ['Users'],
  summary: 'Delete the authenticated user',
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: 'User deleted',
      content: { 'application/json': { schema: DeleteUserResponseSchema } },
    },
    401: errorResponse('Unauthorized'),
    404: errorResponse('User not found'),
    500: errorResponse('Internal server error'),
  },
})

export function createUsersModule() {
  const app = new OpenAPIHono<AppEnv>()

  app.openapi(updateMeRoute, async (c) => {
    const service = createUsersService(createUsersRepository(c.get('prisma')))
    const user = await service.updateMe(c.get('jwtPayload').sub, c.req.valid('json'))
    return c.json({ ok: true as const, data: user }, 200)
  })

  app.openapi(deleteMeRoute, async (c) => {
    const service = createUsersService(createUsersRepository(c.get('prisma')))
    const result = await service.deleteMe(c.get('jwtPayload').sub)
    return c.json({ ok: true as const, data: result }, 200)
  })

  return app
}
