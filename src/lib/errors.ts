export type AppErrorStatus = 400 | 401 | 404 | 409 | 500

export class AppError extends Error {
  constructor(
    public readonly status: AppErrorStatus,
    message: string,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2002'
}
