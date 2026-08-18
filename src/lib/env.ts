import { cleanEnv, host, num, port, str, url } from 'envalid'

/**
 * Validated environment variables.
 * Throws on startup if anything required is missing or invalid — fail fast.
 */
export const env = cleanEnv(process.env, {
  NODE_ENV: str({ choices: ['development', 'test', 'production'], default: 'development' }),

  PORT: port({ default: 3000 }),
  HOST: host({ default: '0.0.0.0' }),

  LOG_LEVEL: str({ choices: ['error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly'], default: 'info' }),
  LOG_DIR: str({ default: './logs' }),
  LOG_MAX_SIZE: str({ default: '20m' }),
  LOG_MAX_FILES: str({ default: '14d' }),

  API_BASE_URL: url({ default: 'https://jsonplaceholder.typicode.com' }),
  API_TIMEOUT_MS: num({ default: 10_000 }),
})

export type Env = typeof env
