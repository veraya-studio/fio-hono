import { z } from '@hono/zod-openapi'
import { successSchema } from '../../lib/http'

export const PlopCheckStatusSchema = z.object({
  module: z.literal('plop-check'),
  status: z.literal('ready'),
}).openapi('PlopCheckStatus')

export const PlopCheckStatusResponseSchema = successSchema(PlopCheckStatusSchema)
  .openapi('PlopCheckStatusResponse')

export type PlopCheckStatus = z.infer<typeof PlopCheckStatusSchema>
