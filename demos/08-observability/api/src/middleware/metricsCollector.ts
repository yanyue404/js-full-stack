import type { NextFunction, Request, Response } from 'express'
import { httpRequestDuration, httpRequestsTotal } from '../lib/metrics.js'

export function metricsCollector(req: Request, res: Response, next: NextFunction) {
  const end = httpRequestDuration.startTimer()
  res.on('finish', () => {
    // 用路由模板（/api/users/:id）而非真实路径做 label，避免高基数
    const route = req.route ? `${req.baseUrl}${req.route.path}` : 'unmatched'
    const labels = { method: req.method, route, status: String(res.statusCode) }
    end(labels)
    httpRequestsTotal.inc(labels)
  })
  next()
}
