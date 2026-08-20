import { applyD1Migrations, env, SELF } from 'cloudflare:test'
import { sign } from 'hono/jwt'
import { beforeEach, describe, expect, it } from 'vitest'

const password = 'strong-password'

interface JsonResponse {
  ok: boolean
  data?: Record<string, unknown>
  error?: { code: string, message: string }
}

async function json(response: Response): Promise<JsonResponse> {
  return response.json() as Promise<JsonResponse>
}

async function register(email = 'user@example.com') {
  return SELF.fetch('https://example.com/api/v1/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, name: 'User', password }),
  })
}

beforeEach(async () => {
  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
  await env.DB.prepare('DELETE FROM User').run()
})

describe('authentication API', () => {
  it('registers a normalized user and rejects duplicates', async () => {
    const created = await register('User@Example.COM')
    expect(created.status).toBe(201)
    expect(await json(created)).toMatchObject({
      ok: true,
      data: {
        tokenType: 'Bearer',
        user: { email: 'user@example.com' },
      },
    })

    const duplicate = await register('user@example.com')
    expect(duplicate.status).toBe(409)
    expect(await json(duplicate)).toMatchObject({
      ok: false,
      error: { code: 'EMAIL_ALREADY_EXISTS' },
    })
  })

  it('accepts valid login credentials and rejects invalid ones', async () => {
    await register()

    const valid = await SELF.fetch('https://example.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password }),
    })
    expect(valid.status).toBe(200)
    expect(await json(valid)).toMatchObject({ ok: true, data: { tokenType: 'Bearer' } })

    const invalid = await SELF.fetch('https://example.com/api/v1/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'user@example.com', password: 'wrong-password' }),
    })
    expect(invalid.status).toBe(401)
    expect(await json(invalid)).toMatchObject({ ok: false, error: { code: 'INVALID_CREDENTIALS' } })
  })

  it('rejects missing, malformed, and expired JWTs', async () => {
    const missing = await SELF.fetch('https://example.com/api/v1/auth/me')
    expect(missing.status).toBe(401)

    const malformed = await SELF.fetch('https://example.com/api/v1/auth/me', {
      headers: { authorization: 'Bearer malformed' },
    })
    expect(malformed.status).toBe(401)

    const now = Math.floor(Date.now() / 1000)
    const expiredToken = await sign({
      sub: crypto.randomUUID(),
      email: 'user@example.com',
      iat: now - 7200,
      exp: now - 3600,
      iss: env.JWT_ISSUER,
      aud: env.JWT_AUDIENCE,
    }, env.JWT_SECRET, 'HS256')
    const expired = await SELF.fetch('https://example.com/api/v1/auth/me', {
      headers: { authorization: `Bearer ${expiredToken}` },
    })
    expect(expired.status).toBe(401)

    for (const response of [missing, malformed, expired]) {
      expect(await json(response)).toMatchObject({
        ok: false,
        error: { code: 'UNAUTHORIZED' },
      })
    }
  })
})

describe('authenticated user API', () => {
  it('reads, updates, and deletes the current user', async () => {
    const registered = await json(await register())
    const accessToken = registered.data?.accessToken
    expect(accessToken).toBeTypeOf('string')
    const headers = { authorization: `Bearer ${accessToken}` }

    const me = await SELF.fetch('https://example.com/api/v1/auth/me', { headers })
    expect(me.status).toBe(200)
    expect(await json(me)).toMatchObject({ ok: true, data: { email: 'user@example.com' } })

    const updated = await SELF.fetch('https://example.com/api/v1/users/me', {
      method: 'PATCH',
      headers: { ...headers, 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Updated User' }),
    })
    expect(updated.status).toBe(200)
    expect(await json(updated)).toMatchObject({ ok: true, data: { name: 'Updated User' } })

    const deleted = await SELF.fetch('https://example.com/api/v1/users/me', {
      method: 'DELETE',
      headers,
    })
    expect(deleted.status).toBe(200)
    expect(await json(deleted)).toEqual({ ok: true, data: { deleted: true } })

    const afterDelete = await SELF.fetch('https://example.com/api/v1/auth/me', { headers })
    expect(afterDelete.status).toBe(404)
    expect(await json(afterDelete)).toMatchObject({ ok: false, error: { code: 'USER_NOT_FOUND' } })
  })
})

describe('hTTP contract', () => {
  it('handles CORS preflight', async () => {
    const response = await SELF.fetch('https://example.com/api/v1/auth/register', {
      method: 'OPTIONS',
      headers: {
        'origin': 'https://client.example.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'Content-Type, Authorization',
      },
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('*')
    expect(response.headers.get('access-control-allow-headers')).toContain('Authorization')
  })

  it('publishes every route and Bearer security scheme in OpenAPI', async () => {
    const response = await SELF.fetch('https://example.com/openapi.json')
    const document = await response.json() as {
      paths: Record<string, unknown>
      components: { securitySchemes: Record<string, unknown> }
    }

    expect(response.status).toBe(200)
    expect(Object.keys(document.paths)).toEqual(expect.arrayContaining([
      '/healthz',
      '/api/v1/auth/register',
      '/api/v1/auth/login',
      '/api/v1/auth/me',
      '/api/v1/users/me',
    ]))
    expect(document.components.securitySchemes.BearerAuth).toMatchObject({
      type: 'http',
      scheme: 'bearer',
    })
  })

  it('serves Scalar and the standard 404 envelope', async () => {
    const docs = await SELF.fetch('https://example.com/docs')
    expect(docs.status).toBe(200)
    expect(await docs.text()).toContain('/openapi.json')

    const missing = await SELF.fetch('https://example.com/not-found')
    expect(missing.status).toBe(404)
    expect(await json(missing)).toEqual({
      ok: false,
      error: { message: 'Route not found', code: 'NOT_FOUND' },
    })
  })
})
