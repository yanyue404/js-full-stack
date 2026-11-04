import { randomUUID } from 'node:crypto'
import type { NextFunction, Request, Response } from 'express'
import type { Logger } from 'pino'
import { logger } from '../lib/logger.js'

declare global {
  namespace Express {
    interface Request {
      requestId: string
      log: Logger
    }
  }
}

/** 为每个请求分配 requestId，并挂一个带上下文的子 logger 到 req.log */
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const incoming = req.get('x-request-id')
  req.requestId = incoming && /^[\w-]{1,64}$/.test(incoming) ? incoming : randomUUID()
  req.log = logger.child({ requestId: req.requestId })
  res.setHeader('X-Request-Id', req.requestId)

  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'
    req.log[level](
      { method: req.method, url: req.originalUrl, status: res.statusCode, durationMs: +durationMs.toFixed(1), ip: req.ip },
      'request completed'
    )
  })
  next()
}
