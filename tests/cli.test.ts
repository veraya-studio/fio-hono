import { describe, expect, it, beforeAll, afterAll, mock, spyOn } from 'bun:test'
import { infoAction, fetchAction, serveAction, buildCli, run } from '../src/cli'

/**
 * Direct unit tests — call the action handlers and CLI in-process.
 * Uses bun:test primitives (mock/spyOn from bun:test, vitest-compatible names).
 */
describe('CLI action handlers', () => {
  it('infoAction prints a valid JSON payload', () => {
    const log = spyOn(console, 'log').mockImplementation(() => {})
    try {
      infoAction()
      expect(log.mock.calls.length).toBe(1)
      const payload = JSON.parse(log.mock.calls[0]![0] as string)
      expect(payload.name).toBe('pio-bun-minimal-boilerplate')
      expect(payload.bun).toBeTypeOf('string')
      expect(payload.uptime).toBeTypeOf('number')
      expect(payload.pid).toBe(process.pid)
    }
    finally {
      log.mockRestore()
    }
  })

  it('serveAction does not throw', () => {
    // Winston's Console transport writes to its own Console instance, not the
    // global `console`. We assert behavior indirectly here; the subprocess
    // test below covers end-to-end output behavior.
    expect(() => serveAction()).not.toThrow()
  })

  it('fetchAction returns parsed data on success', async () => {
    const log = spyOn(console, 'log').mockImplementation(() => {})
    try {
      const data = await fetchAction('/todos/1')
      expect(data).toMatchObject({ id: 1, userId: 1 })
    }
    finally {
      log.mockRestore()
    }
  })

  it('fetchAction sets exitCode and rethrows on failure', async () => {
    spyOn(console, 'log').mockImplementation(() => {})
    spyOn(console, 'error').mockImplementation(() => {})
    const prev = process.exitCode
    try {
      await expect(fetchAction('/__definitely_404_path__')).rejects.toBeDefined()
      expect(process.exitCode).toBe(1)
    }
    finally {
      process.exitCode = prev
    }
  })
})

/**
 * End-to-end: spawn the CLI as a subprocess the same way a user would.
 * `process.execPath` is the bun binary when tests run under bun.
 */
const BUN_BIN = process.execPath

async function runCli(args: string[], env: Record<string, string> = {}): Promise<{ stdout: string, stderr: string, code: number | null }> {
  const { spawn } = await import('node:child_process')
  return new Promise((resolve) => {
    const child = spawn(BUN_BIN, ['run', 'src/cli/index.ts', ...args], {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
    })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => (stdout += d.toString()))
    child.stderr.on('data', d => (stderr += d.toString()))
    child.on('close', code => resolve({ stdout, stderr, code }))
  })
}

describe('CLI subprocess', () => {
  it('exits 0 on `info` and prints a JSON object', async () => {
    const { stdout, stderr, code } = await runCli(['info'])
    expect(code).toBe(0)
    expect(stderr).toBe('')
    const payload = JSON.parse(stdout)
    expect(payload.name).toBe('pio-bun-minimal-boilerplate')
  }, 15_000)

  it('exits 0 on `serve` (hint log only)', async () => {
    const { code } = await runCli(['serve'])
    expect(code).toBe(0)
  }, 15_000)

  it('exits 0 on `fetch <path>` with a reachable API', async () => {
    const { stdout, code } = await runCli(['fetch', '/todos/1'])
    expect(code).toBe(0)
    const payload = JSON.parse(stdout)
    expect(payload.id).toBe(1)
  }, 30_000)

  it('exits non-zero on `fetch` with an unreachable path', async () => {
    const { code } = await runCli(['fetch', '/__404_path_for_test__'])
    expect(code).not.toBe(0)
  }, 30_000)

  it('prints help when called with `--help`', async () => {
    const { stdout, code } = await runCli(['--help'])
    expect(code).toBe(0)
    expect(stdout).toMatch(/Usage:/i)
    expect(stdout).toMatch(/info/)
    expect(stdout).toMatch(/fetch/)
    expect(stdout).toMatch(/serve/)
  }, 15_000)
})

describe('CLI in-process runner', () => {
  let exitSpy: ReturnType<typeof spyOn>
  beforeAll(() => {
    exitSpy = spyOn(process, 'exit').mockImplementation((() => {}) as never)
  })
  afterAll(() => {
    exitSpy.mockRestore()
  })

  it('run() handles `info` without throwing', async () => {
    await expect(run(['node', 'pio', 'info'])).resolves.toBeUndefined()
  })

  it('buildCli() returns a cac instance with the expected commands', () => {
    const cli = buildCli()
    const names = (cli as unknown as { commands: { name: string }[] }).commands.map(c => c.name)
    expect(names).toEqual(expect.arrayContaining(['info', 'fetch', 'serve']))
  })
})
