import { describe, expect, it } from 'bun:test'
import { hashPassword, passwordPolicy, verifyPassword } from '../src/lib/password'

describe('password hashing', () => {
  it('uses PBKDF2-HMAC-SHA256 with a unique salt', async () => {
    const first = await hashPassword('correct horse battery staple')
    const second = await hashPassword('correct horse battery staple')

    expect(passwordPolicy.iterations).toBe(600_000)
    expect(first).toStartWith('pbkdf2_sha256$600000$')
    expect(first).not.toBe(second)
    expect(await verifyPassword('correct horse battery staple', first)).toBe(true)
    expect(await verifyPassword('wrong password', first)).toBe(false)
    expect(await verifyPassword('correct horse battery staple', 'invalid')).toBe(false)
  }, 15_000)
})
