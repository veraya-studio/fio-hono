import { describe, expect, it } from 'bun:test'
import { createApp } from '../src/app'

const testEnv = {
  DB: undefined as unknown as D1Database,
  JWT_SECRET: 'unit-test-secret-with-at-least-32-bytes',
  JWT_ISSUER: 'fio-hono-cf',
  JWT_AUDIENCE: 'fio-hono-api',
  JWT_TTL_SECONDS: '3600',
  CORS_ORIGINS: '*',
  LOG_LEVEL: 'error',
} as CloudflareBindings

describe('application responses', () => {
  it('returns the health envelope', async () => {
    const response = await createApp().request('/healthz', {}, testEnv)
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      ok: true,
      data: { status: 'ok' },
    })
  })

  it('returns the standard 404 envelope', async () => {
    const response = await createApp().request('/missing', {}, testEnv)
    expect(response.status).toBe(404)
    expect(await response.json() as unknown).toEqual({
      ok: false,
      error: { message: 'Route not found', code: 'NOT_FOUND' },
    })
  })

  it('maps an unknown error to a masked 500 envelope', async () => {
    const app = createApp()
    app.get('/test/boom', () => {
      throw new Error('sensitive database detail')
    })

    const response = await app.request('/test/boom', {}, testEnv)
    expect(response.status).toBe(500)
    expect(await response.json() as unknown).toEqual({
      ok: false,
      error: { message: 'Internal server error', code: 'INTERNAL_ERROR' },
    })
  })
})
