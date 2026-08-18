import type { Middleware } from '../app'
import { fail, HttpError } from '../lib/http'
import { logger } from '../lib/logger'
import { ZodError } from 'zod'

/**
 * Global error handler — converts known errors into proper JSON responses,
 * logs everything else as 500.
 */
export const errorHandler: Middleware = async (request, next) => {
  try {
    return await next(request)
  }
  catch (err) {
    if (err instanceof HttpError) {
      return fail(err.status, err.message, err.code, err.details)
    }

    if (err instanceof ZodError) {
      return fail(400, 'Invalid request payload', 'VALIDATION_ERROR', err.issues)
    }

    logger.error('unhandled error', {
      url: request.url,
      method: request.method,
      message: (err as Error).message,
      stack: (err as Error).stack,
    })

    return fail(500, 'Internal server error', 'INTERNAL_ERROR')
  }
}
