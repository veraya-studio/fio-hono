import * as winston from 'winston'

const { combine, errors, json, splat, timestamp } = winston.format

export function createLogger(level: string) {
  return winston.createLogger({
    level,
    defaultMeta: {
      service: 'fio-hono-cf',
    },
    format: combine(
      timestamp(),
      errors({ stack: true }),
      splat(),
      json(),
    ),
    transports: [new winston.transports.Console()],
  })
}

export type Logger = ReturnType<typeof createLogger>
