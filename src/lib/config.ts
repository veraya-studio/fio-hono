import { AppError } from './errors'

const WINSTON_LEVELS = new Set([
  'error',
  'warn',
  'info',
  'http',
  'verbose',
  'debug',
  'silly',
])

export interface AuthConfig {
  secret: string
  issuer: string
  audience: string
  ttlSeconds: number
}

export function getAuthConfig(env: CloudflareBindings): AuthConfig {
  const secretBytes = new TextEncoder().encode(env.JWT_SECRET).byteLength
  if (secretBytes < 32) {
    throw new AppError(500, 'Server authentication is not configured', 'AUTH_CONFIG_ERROR')
  }

  const ttlSeconds = Number.parseInt(env.JWT_TTL_SECONDS, 10)
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new AppError(500, 'Server authentication is not configured', 'AUTH_CONFIG_ERROR')
  }

  return {
    secret: env.JWT_SECRET,
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
    ttlSeconds,
  }
}

export function getCorsOrigins(env: CloudflareBindings): string[] {
  const origins = env.CORS_ORIGINS
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean)

  return origins.length > 0 ? origins : ['*']
}

export function getLogLevel(env: CloudflareBindings): string {
  return WINSTON_LEVELS.has(env.LOG_LEVEL) ? env.LOG_LEVEL : 'info'
}
