import type { AppEnv } from './types'
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { getCorsOrigins } from './lib/config'
import { AppError, isUniqueConstraintError } from './lib/errors'
import { errorBody, successSchema } from './lib/http'
import { prismaContext, requestContext } from './middleware/request-context'
import { createAuthModule } from './modules/auth'
import { createPlopCheckModule } from './modules/plop-check'
import { createUsersModule } from './modules/users'
// plop:module-imports

const HealthResponseSchema = successSchema(z.object({
  status: z.literal('ok'),
  timestamp: z.iso.datetime(),
})).openapi('HealthResponse')

const healthRoute = createRoute({
  method: 'get',
  path: '/healthz',
  tags: ['System'],
  summary: 'Check Worker health',
  responses: {
    200: {
      description: 'Worker is healthy',
      content: { 'application/json': { schema: HealthResponseSchema } },
    },
  },
})

export function createApp() {
  const app = new OpenAPIHono<AppEnv>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return c.json(
          errorBody('Invalid request', 'VALIDATION_ERROR', result.error.issues),
          400,
        )
      }
    },
  })

  app.use('*', requestContext)
  app.use('*', async (c, next) => {
    const allowedOrigins = getCorsOrigins(c.env)
    return cors({
      origin: (origin) => {
        if (allowedOrigins.includes('*'))
          return '*'

        return allowedOrigins.includes(origin) ? origin : null
      },
      allowMethods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      credentials: false,
      maxAge: 600,
    })(c, next)
  })
  app.use('/api/v1/*', prismaContext)

  app.openapi(healthRoute, (c) => {
    return c.json({
      ok: true as const,
      data: {
        status: 'ok' as const,
        timestamp: new Date().toISOString(),
      },
    }, 200)
  })

  app.route('/api/v1/auth', createAuthModule())
  app.route('/api/v1/users', createUsersModule())
  app.route('/api/v1/plop-check', createPlopCheckModule())
  // plop:module-routes

  app.openAPIRegistry.registerComponent('securitySchemes', 'BearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  })

  app.doc31('/openapi.json', {
    openapi: '3.1.0',
    info: {
      title: 'fio-hono API',
      version: '1.0.0',
      description: 'Hono + Cloudflare Workers boilerplate API.',
    },
  })

  app.get('/docs', Scalar({
    url: '/openapi.json',
    pageTitle: 'fio-hono API Reference',
    theme: 'kepler',
  }))

  app.notFound((c) => {
    return c.json(errorBody('Route not found', 'NOT_FOUND'), 404)
  })

  app.onError((error, c) => {
    if (error instanceof AppError)
      return c.json(errorBody(error.message, error.code, error.details), error.status)

    if (error instanceof HTTPException && error.status === 401)
      return c.json(errorBody('Unauthorized', 'UNAUTHORIZED'), 401)

    if (isUniqueConstraintError(error))
      return c.json(errorBody('Email is already registered', 'EMAIL_ALREADY_EXISTS'), 409)

    c.get('logger')?.error('unhandled error', {
      method: c.req.method,
      path: c.req.path,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    return c.json(errorBody('Internal server error', 'INTERNAL_ERROR'), 500)
  })

  return app
}
