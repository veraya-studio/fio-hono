import { describe, expect, it } from 'bun:test'
import { verify } from 'hono/jwt'
import { issueAccessToken } from '../src/lib/token'

const config = {
  secret: 'unit-test-secret-with-at-least-32-bytes',
  issuer: 'test-issuer',
  audience: 'test-audience',
  ttlSeconds: 3600,
}

describe('access tokens', () => {
  it('contains the expected HS256 claims', async () => {
    const issuedAt = Math.floor(Date.now() / 1000) - 10
    const issued = await issueAccessToken({ id: 'user-id', email: 'user@example.com' }, config, issuedAt)
    const payload = await verify(issued.accessToken, config.secret, {
      alg: 'HS256',
      iss: config.issuer,
      aud: config.audience,
    })

    expect(payload).toMatchObject({
      sub: 'user-id',
      email: 'user@example.com',
      iat: issuedAt,
      exp: issuedAt + 3600,
      iss: 'test-issuer',
      aud: 'test-audience',
    })
  })
})
