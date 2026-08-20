import { z } from '@hono/zod-openapi'
import { successSchema } from '../../lib/http'

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(1).max(100),
}).openapi('UpdateUserRequest')

export const DeleteUserDataSchema = z.object({
  deleted: z.literal(true),
}).openapi('DeleteUserData')

export const DeleteUserResponseSchema = successSchema(DeleteUserDataSchema).openapi('DeleteUserResponse')

export type UpdateUserInput = z.infer<typeof UpdateUserSchema>
