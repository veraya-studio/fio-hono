import type { AccessTokenPayload, AppEnv } from '../types'
import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { jwt } from 'hono/jwt'
import { getAuthConfig } from '../lib/config'
import { AppError } from '../lib/errors'

function isAccessTokenPayload(payload: unknown): payload is AccessTokenPayload {
  if (typeof payload !== 'object' || payload === null)
    return false

  const candidate = payload as Partial<AccessTokenPayload>
  return typeof candidate.sub === 'string'
    && typeof candidate.email === 'string'
    && typeof candidate.iat === 'number'
    && typeof candidate.exp === 'number'
    && typeof candidate.iss === 'string'
    && typeof candidate.aud === 'string'
}

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const config = getAuthConfig(c.env)

  try {
    await jwt({
      secret: config.secret,
      alg: 'HS256',
      verification: {
        iss: config.issuer,
        aud: config.audience,
      },
    })(c, async () => {})
  }
  catch (error) {
    if (error instanceof HTTPException && error.status === 401)
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED')

    throw error
  }

  const payload = c.get('jwtPayload')
  if (!isAccessTokenPayload(payload))
    throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED')

  c.set('jwtPayload', payload)
  await next()
})
