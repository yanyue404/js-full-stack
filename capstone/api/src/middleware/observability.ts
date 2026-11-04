import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'
import { logger } from '../lib/logger.js'
import { httpDuration, httpTotal } from '../lib/metrics.js'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      log: Logger
    }
  }
}

/** requestId + 结构化访问日志 + Prometheus 指标 */
export function observability(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get('x-request-id')
  req.requestId = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID()
  req.log = logger.child({ requestId: req.requestId })
  res.setHeader('X-Request-Id', req.requestId)

  const end = httpDuration.startTimer()
  const start = performance.now()
  res.on('finish', () => {
    // 用路由模板做 label，避免 /tasks/<uuid> 造成高基数
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched'
    const labels = { method: req.method, route, status: String(res.statusCode) }
    end(labels)
    httpTotal.inc(labels)
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    req.log[level](
      {
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        durationMs: Math.round(performance.now() - start),
        userId: req.user?.userId
      },
      'request completed'
    )
  })
  next()
}
