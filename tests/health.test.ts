import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app'

describe('GET /healthz', () => {
  it('returns ok', async () => {
    const app = createApp()
    const res = await app(new Request('http://localhost/healthz'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean, data: { status: string } }
    expect(body.ok).toBe(true)
    expect(body.data.status).toBe('ok')
  })

  it('returns 404 for unknown routes', async () => {
    const app = createApp()
    const res = await app(new Request('http://localhost/nope'))
    expect(res.status).toBe(404)
  })
})
