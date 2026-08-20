import { z } from '@hono/zod-openapi'

export interface ApiSuccess<T> {
  ok: true
  data: T
}

export interface ApiError {
  ok: false
  error: {
    message: string
    code: string
    details?: unknown
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

export const ErrorResponseSchema = z.object({
  ok: z.literal(false),
  error: z.object({
    message: z.string(),
    code: z.string(),
    details: z.unknown().optional(),
  }),
}).openapi('ErrorResponse')

export function successSchema<T extends z.ZodType>(data: T) {
  return z.object({
    ok: z.literal(true),
    data,
  })
}

export function errorBody(message: string, code: string, details?: unknown): ApiError {
  return {
    ok: false,
    error: {
      message,
      code,
      ...(details === undefined ? {} : { details }),
    },
  }
}

export function errorResponse(description: string) {
  return {
    description,
    content: {
      'application/json': {
        schema: ErrorResponseSchema,
      },
    },
  }
}
