import { cac } from 'cac'
import { env } from '../lib/env'
import { logger } from '../lib/logger'
import { fetcher } from '../lib/fetcher'

/**
 * Action handler for `pio info`.
 * Exported so tests can import and call it directly.
 */
export function infoAction(): void {
  console.log(JSON.stringify({
    name: 'pio-bun-minimal-boilerplate',
    env: env.NODE_ENV,
    pid: process.pid,
    bun: Bun.version,
    uptime: process.uptime(),
  }, null, 2))
}

/**
 * Action handler for `pio fetch <path>`.
 * Exported for direct unit tests; the CLI wires it to `cac`.
 */
export async function fetchAction(path: string, options: { full?: boolean } = {}): Promise<unknown> {
  try {
    const data = await fetcher<unknown>(path)
    const out = JSON.stringify(data, null, 2)
    console.log(out)
    return data
  }
  catch (err) {
    logger.error('fetch failed', { path, message: (err as Error).message })
    process.exitCode = 1
    throw err
  }
}

/**
 * Action handler for `pio serve`.
 * Exported for direct unit tests.
 */
export function serveAction(): void {
  logger.info('hint: use `bun run dev` to start the server with hot reload')
}

/**
 * Build the cac CLI instance. Exported so tests can drive it without
 * touching process.argv.
 */
export function buildCli() {
  const cli = cac('pio')

  cli
    .command('info', 'Show environment and runtime info')
    .action(infoAction)

  cli
    .command('fetch <path>', 'GET a path from API_BASE_URL via the shared ofetch client')
    .option('--full', 'Print full response object instead of just data')
    .example('pio fetch /todos/1')
    .action(fetchAction)

  cli
    .command('serve', 'Start the HTTP server (alias for `bun run src/server.ts`)')
    .action(serveAction)

  cli.help()
  cli.version('0.1.0')
  return cli
}

/**
 * Entry point used when the file is executed as a script.
 * Kept as a function (and not auto-called) so tests can import this module
 * without side effects.
 */
export async function run(argv: string[] = process.argv): Promise<void> {
  const cli = buildCli()
  try {
    cli.parse(argv, { run: false })
    await cli.runMatchedCommand()
  }
  catch (err) {
    logger.error('cli error', { message: (err as Error).message })
    process.exitCode = 1
  }
}

// Run when invoked directly (bun run src/cli/index.ts …).
// Guarded with `import.meta.main` so the file remains import-safe.
if (import.meta.main) {
  await run()
}
