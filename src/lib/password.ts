const DEFAULT_ITERATIONS = 600_000
const SALT_BYTES = 16
const HASH_BYTES = 32
const PASSWORD_ALGORITHM = 'pbkdf2_sha256'

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes)
    binary += String.fromCharCode(byte)

  return btoa(binary)
}

function decodeBase64(value: string): Uint8Array {
  const binary = atob(value)
  return Uint8Array.from(binary, character => character.charCodeAt(0))
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const saltBuffer = Uint8Array.from(salt).buffer
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  )

  const bits = await crypto.subtle.deriveBits({
    name: 'PBKDF2',
    hash: 'SHA-256',
    salt: saltBuffer,
    iterations,
  }, key, HASH_BYTES * 8)

  return new Uint8Array(bits)
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength)
    return false

  let difference = 0
  for (let index = 0; index < left.byteLength; index++)
    difference |= left[index]! ^ right[index]!

  return difference === 0
}

export async function hashPassword(
  password: string,
  iterations = DEFAULT_ITERATIONS,
): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES))
  const hash = await derivePassword(password, salt, iterations)

  return [
    PASSWORD_ALGORITHM,
    iterations,
    encodeBase64(salt),
    encodeBase64(hash),
  ].join('$')
}

export async function verifyPassword(
  password: string,
  encodedPassword: string,
): Promise<boolean> {
  const [algorithm, iterationsValue, saltValue, hashValue, extra] = encodedPassword.split('$')
  const iterations = Number.parseInt(iterationsValue ?? '', 10)

  if (algorithm !== PASSWORD_ALGORITHM
    || !Number.isSafeInteger(iterations)
    || iterations <= 0
    || !saltValue
    || !hashValue
    || extra !== undefined) {
    return false
  }

  try {
    const expected = decodeBase64(hashValue)
    const actual = await derivePassword(password, decodeBase64(saltValue), iterations)
    return constantTimeEqual(actual, expected)
  }
  catch {
    return false
  }
}

export const passwordPolicy = {
  algorithm: PASSWORD_ALGORITHM,
  iterations: DEFAULT_ITERATIONS,
} as const
