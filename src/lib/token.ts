import type { AccessTokenPayload } from '../types'
import type { AuthConfig } from './config'
import { sign } from 'hono/jwt'

export async function issueAccessToken(
  user: { id: string, email: string },
  config: AuthConfig,
  issuedAt = Math.floor(Date.now() / 1000),
): Promise<{ accessToken: string, expiresIn: number, payload: AccessTokenPayload }> {
  const payload: AccessTokenPayload = {
    sub: user.id,
    email: user.email,
    iat: issuedAt,
    exp: issuedAt + config.ttlSeconds,
    iss: config.issuer,
    aud: config.audience,
  }

  return {
    accessToken: await sign(payload, config.secret, 'HS256'),
    expiresIn: config.ttlSeconds,
    payload,
  }
}
