import type { AppEnv } from '../types'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { getLogLevel } from '../lib/config'
import { AppError } from '../lib/errors'
import { createLogger } from '../lib/logger'
import { createPrisma } from '../lib/prisma'

export const requestContext = createMiddleware<AppEnv>(async (c, next) => {
  const startedAt = Date.now()
  const requestId = c.req.header('cf-ray') ?? crypto.randomUUID()
  const logger = createLogger(getLogLevel(c.env)).child({ requestId })

  c.set('requestId', requestId)
  c.set('logger', logger)
  c.header('x-request-id', requestId)

  try {
    await next()
    logger.info('request', {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    })
  }
  catch (error) {
    const status = error instanceof AppError || error instanceof HTTPException
      ? error.status
      : 500
    logger.info('request', {
      method: c.req.method,
      path: c.req.path,
      status,
      durationMs: Date.now() - startedAt,
    })
    throw error
  }
})

export const prismaContext = createMiddleware<AppEnv>(async (c, next) => {
  const prisma = createPrisma(c.env.DB)
  c.set('prisma', prisma)

  try {
    await next()
  }
  finally {
    await prisma.$disconnect()
  }
})
