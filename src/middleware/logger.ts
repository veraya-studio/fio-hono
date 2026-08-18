import type { Middleware } from '../app'
import { logger } from '../lib/logger'

/**
 * Logs every incoming request with method, path, status, and duration.
 */
export const requestLogger: Middleware = async (request, next) => {
  const start = Date.now()
  const { method } = request
  const url = new URL(request.url)
  const path = url.pathname + url.search

  try {
    const response = await next(request)
    logger.info('request', {
      method,
      path,
      status: response.status,
      durationMs: Date.now() - start,
    })
    return response
  }
  catch (err) {
    logger.error('request failed', {
      method,
      path,
      durationMs: Date.now() - start,
      message: (err as Error).message,
    })
    throw err
  }
}
