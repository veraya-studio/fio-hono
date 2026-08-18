import { createApp } from './app'
import { env } from './lib/env'
import { logger } from './lib/logger'

const app = createApp()

const server = Bun.serve({
  port: env.PORT,
  hostname: env.HOST,
  development: env.NODE_ENV !== 'production',
  fetch: app,
  error(err) {
    logger.error('bun.serve error', { message: err.message, stack: err.stack })
    return new Response(JSON.stringify({ ok: false, error: { message: 'Internal server error' } }), {
      status: 500,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    })
  },
})

logger.info('server listening', {
  url: server.url,
  env: env.NODE_ENV,
  pid: process.pid,
})

// Graceful shutdown
const shutdown = (signal: NodeJS.Signals) => {
  logger.info('shutdown signal received', { signal })
  server.stop()
  setTimeout(() => process.exit(0), 250).unref()
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, shutdown)
}
