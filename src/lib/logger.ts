import path from 'node:path'
import winston from 'winston'
import 'winston-daily-rotate-file'
import { env } from './env'

const { combine, timestamp, errors, splat, json, colorize, printf, align } = winston.format

/**
 * Human-friendly console format used in development.
 */
const consoleFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:MM:ss' }),
  align(),
  printf((info) => {
    const { level, message, timestamp: ts, ...meta } = info
    const splatKeys = (info as { splat?: unknown[] }).splat
    const splatObj = Array.isArray(splatKeys) && splatKeys.length > 0 && typeof splatKeys[0] === 'object'
      ? splatKeys[0] as Record<string, unknown>
      : {}
    const merged = { ...meta, ...splatObj }
    const metaStr = Object.keys(merged).length ? ` ${JSON.stringify(merged)}` : ''
    return `${ts} ${level} ${message}${metaStr}`
  }),
)

/**
 * JSON format used in production / for log aggregators.
 */
const fileFormat = combine(
  timestamp(),
  errors({ stack: true }),
  splat(),
  json(),
)

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: env.NODE_ENV === 'production' ? fileFormat : consoleFormat,
  }),
]

// Daily-rotate file transport for non-test environments.
if (env.NODE_ENV !== 'test') {
  transports.push(
    new winston.transports.DailyRotateFile({
      dirname: path.resolve(env.LOG_DIR),
      filename: '%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: env.LOG_MAX_SIZE,
      maxFiles: env.LOG_MAX_FILES,
      format: fileFormat,
    }),
  )
}

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: 'pio-bun' },
  transports,
})

export type Logger = typeof logger
