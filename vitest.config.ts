import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

export default defineConfig(async () => {
  const migrations = await readD1Migrations('./migrations')

  return {
    plugins: [
      cloudflareTest({
        wrangler: {
          configPath: './wrangler.jsonc',
        },
        remoteBindings: false,
        miniflare: {
          // The test pool currently bundles workerd with support through this date.
          compatibilityDate: '2026-08-15',
          bindings: {
            JWT_SECRET: 'worker-test-secret-with-at-least-32-bytes',
            TEST_MIGRATIONS: migrations,
          },
        },
      }),
    ],
    test: {
      include: ['worker-tests/**/*.worker.ts'],
    },
  }
})
