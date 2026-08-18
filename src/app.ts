import { errorHandler } from './middleware/error-handler'
import { requestLogger } from './middleware/logger'
import { cors } from './middleware/cors'
import { routes } from './routes'
import { fail } from './lib/http'

export type Handler = (request: Request) => Response | Promise<Response>
export type Middleware = (request: Request, next: Handler) => Response | Promise<Response>
export type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'
export type Route = [Method, string, Handler]
export type Routes = Route[]

interface AppOptions {
  cors?: boolean
}

/**
 * Composes the middleware chain (outermost first) and returns a single
 * request handler. Keeping app.ts framework-free makes it trivial to test.
 */
export function createApp(options: AppOptions = {}) {
  const stack: Middleware[] = [errorHandler, requestLogger]
  if (options.cors !== false) stack.push(cors())

  const composed: Middleware = stack.reduceRight<Middleware>(
    (next, mw) => (request => mw(request, next)),
    async (request) => dispatch(request),
  )

  async function dispatch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const match = routes.find(([method, path]) => method === request.method && path === url.pathname)
    if (!match) return fail(404, `Route not found: ${request.method} ${url.pathname}`, 'NOT_FOUND')
    const [, , handler] = match
    return handler(request)
  }

  return async function app(request: Request): Promise<Response> {
    return composed(request)
  }
}
