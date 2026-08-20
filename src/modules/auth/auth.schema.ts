import { z } from '@hono/zod-openapi'
import { successSchema } from '../../lib/http'

export const UserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).openapi('User')

export const RegisterSchema = z.object({
  email: z.email().max(254),
  name: z.string().trim().min(1).max(100),
  password: z.string().min(8).max(128),
}).openapi('RegisterRequest')

export const LoginSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(1).max(128),
}).openapi('LoginRequest')

export const AuthDataSchema = z.object({
  user: UserSchema,
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.number().int().positive(),
}).openapi('AuthData')

export const AuthResponseSchema = successSchema(AuthDataSchema).openapi('AuthResponse')
export const UserResponseSchema = successSchema(UserSchema).openapi('UserResponse')

export type RegisterInput = z.infer<typeof RegisterSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type PublicUser = z.infer<typeof UserSchema>
