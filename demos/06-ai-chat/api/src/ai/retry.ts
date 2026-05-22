interface ApiErrorLike {
  status?: number
  statusCode?: number
}

function isRetryable(err: unknown): boolean {
  const status = (err as ApiErrorLike)?.status ?? (err as ApiErrorLike)?.statusCode
  return status === 429 || status === 500 || status === 502 || status === 503
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxRetries?: number; baseDelay?: number } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 2
  const baseDelay = options.baseDelay ?? 800

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      if (attempt === maxRetries || !isRetryable(err)) {
        throw err
      }
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** attempt))
    }
  }
  throw new Error('unreachable')
}
