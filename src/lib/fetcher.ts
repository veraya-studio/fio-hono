import { ofetch, type $Fetch } from 'ofetch'
import { env } from './env'
import { logger } from './logger'

/**
 * Shared ofetch instance with sensible defaults.
 * - times out after `API_TIMEOUT_MS`
 * - throws on non-2xx by default
 * - logs every request (method, url, status, duration) via winston
 */
export const fetcher: $Fetch = ofetch.create({
  baseURL: env.API_BASE_URL,
  timeout: env.API_TIMEOUT_MS,
  retry: 0,
  onRequest({ request, options }) {
    (options as { _startedAt?: number })._startedAt = Date.now()
    logger.debug('http request', { method: options.method ?? 'GET', url: request })
  },
  onResponse({ request, options, response }) {
    const started = (options as { _startedAt?: number })._startedAt ?? Date.now()
    logger.debug('http response', {
      method: options.method ?? 'GET',
      url: request,
      status: response.status,
      durationMs: Date.now() - started,
    })
  },
  onResponseError({ request, options, error }) {
    const started = (options as { _startedAt?: number })._startedAt ?? Date.now()
    logger.warn('http error', {
      method: options.method ?? 'GET',
      url: request,
      message: error.message,
      durationMs: Date.now() - started,
    })
  },
})
