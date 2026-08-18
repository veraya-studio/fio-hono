import { z } from 'zod'
import { fail, HttpError, json } from '../lib/http'

const EchoSchema = z.object({
  message: z.string().min(1).max(1000),
})

/**
 * Minimal POST example showing how to use Zod validation + JSON responses.
 */
export async function echo(request: Request): Promise<Response> {
  let body: unknown
  try {
    body = await request.json()
  }
  catch {
    throw new HttpError(400, 'Invalid JSON body', 'INVALID_JSON')
  }

  const { message } = EchoSchema.parse(body)
  return json({ echoed: message })
}

export const _schema = EchoSchema // exported for tests
export const _errorExample = (): never => { throw new HttpError(418, "I'm a teapot", 'TEAPOT') }

export { fail }
