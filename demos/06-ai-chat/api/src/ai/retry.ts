interface ApiErrorLike {
  status?: number
  statusCode?: number
}

/** 429 / 5xx 指数退避重试；4xx 业务错误直接抛出，避免无意义重试 */
function isRetryable(err: unknown): boolean {
  const status = (err as ApiErrorLike)?.status ?? (err as ApiErrorLike)?.statusCode
  return status === 429 || status === 500 || status === 502 || status === 503
}

/**
 * 包装单次 AI 调用，遇限流/网关错误自动重试。
 * chat / recipe 路由均在模型链的内层使用；模型切换降级在外层 for-loop。
 */
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
