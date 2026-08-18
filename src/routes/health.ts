import { json } from '../lib/http'
import { env } from '../lib/env'

export function health(): Response {
  return json({
    status: 'ok',
    uptime: process.uptime(),
    env: env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
}
