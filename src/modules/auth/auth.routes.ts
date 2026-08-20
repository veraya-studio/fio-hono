import type { AppEnv } from '../../types'
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { getAuthConfig } from '../../lib/config'
import { errorResponse } from '../../lib/http'
import { requireAuth } from '../../middleware/auth'
import { createAuthRepository } from './auth.repository'
import { AuthResponseSchema, LoginSchema, RegisterSchema, UserResponseSchema } from './auth.schema'
import { createAuthService } from './auth.service'

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Auth'],
  summary: 'Register a user',
  request: {
    body: {
      required: true,
      content: {
        'application/json': { schema: RegisterSchema },
      },
    },
  },
  responses: {
    201: {
      description: 'User registered',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
    400: errorResponse('Invalid request'),
    409: errorResponse('Email already exists'),
    500: errorResponse('Internal server error'),
  },
})

const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Auth'],
  summary: 'Login with email and password',
  request: {
    body: {
      required: true,
      content: {
        'application/json': { schema: LoginSchema },
      },
    },
  },
  responses: {
    200: {
      description: 'Authenticated',
      content: { 'application/json': { schema: AuthResponseSchema } },
    },
    400: errorResponse('Invalid request'),
    401: errorResponse('Invalid credentials'),
    500: errorResponse('Internal server error'),
  },
})

const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Auth'],
  summary: 'Get the authenticated user',
  security: [{ BearerAuth: [] }],
  middleware: [requireAuth] as const,
  responses: {
    200: {
      description: 'Authenticated user',
      content: { 'application/json': { schema: UserResponseSchema } },
    },
    401: errorResponse('Unauthorized'),
    404: errorResponse('User not found'),
    500: errorResponse('Internal server error'),
  },
})

export function createAuthModule() {
  const app = new OpenAPIHono<AppEnv>()

  app.openapi(registerRoute, async (c) => {
    const service = createAuthService(createAuthRepository(c.get('prisma')), getAuthConfig(c.env))
    const result = await service.register(c.req.valid('json'))
    return c.json({ ok: true as const, data: result }, 201)
  })

  app.openapi(loginRoute, async (c) => {
    const service = createAuthService(createAuthRepository(c.get('prisma')), getAuthConfig(c.env))
    const result = await service.login(c.req.valid('json'))
    return c.json({ ok: true as const, data: result }, 200)
  })

  app.openapi(meRoute, async (c) => {
    const service = createAuthService(createAuthRepository(c.get('prisma')), getAuthConfig(c.env))
    const user = await service.me(c.get('jwtPayload').sub)
    return c.json({ ok: true as const, data: user }, 200)
  })

  return app
}
