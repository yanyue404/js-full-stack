import crypto from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id']
  req.id = typeof incoming === 'string' && incoming.length > 0 ? incoming : crypto.randomUUID()
  res.setHeader('x-request-id', req.id)

  const start = Date.now()
  res.on('finish', () => {
    const duration = Date.now() - start
    console.log(
      `[${req.id}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`
    )
  })
  next()
}
