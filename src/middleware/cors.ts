import type { Middleware } from '../app'

interface CorsOptions {
  origin?: string | string[]
  methods?: string[]
  headers?: string[]
}

const DEFAULT_OPTIONS: Required<CorsOptions> = {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  headers: ['Content-Type', 'Authorization'],
}

/**
 * Basic CORS middleware. Handles preflight and sets headers on every response.
 */
export function cors(options: CorsOptions = {}): Middleware {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  return async (request, next) => {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request, opts) })
    }

    const response = await next(request)
    const headers = corsHeaders(request, opts)
    headers.forEach((value, key) => response.headers.set(key, value))
    return response
  }
}

function corsHeaders(request: Request, opts: Required<CorsOptions>): Headers {
  const headers = new Headers()
  const reqOrigin = request.headers.get('origin')

  const allowOrigin = Array.isArray(opts.origin)
    ? (reqOrigin && opts.origin.includes(reqOrigin) ? reqOrigin : opts.origin[0]!)
    : opts.origin

  headers.set('access-control-allow-origin', allowOrigin)
  headers.set('access-control-allow-methods', opts.methods.join(', '))
  headers.set('access-control-allow-headers', opts.headers.join(', '))
  headers.set('access-control-max-age', '600')
  return headers
}
