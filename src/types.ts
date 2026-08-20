import type { Logger } from 'winston'
import type { PrismaClient } from './generated/prisma/client'

export interface AccessTokenPayload {
  [key: string]: unknown
  sub: string
  email: string
  iat: number
  exp: number
  iss: string
  aud: string
}

export interface AppVariables {
  logger: Logger
  prisma: PrismaClient
  requestId: string
  jwtPayload: AccessTokenPayload
}

export interface AppEnv {
  Bindings: CloudflareBindings
  Variables: AppVariables
}
