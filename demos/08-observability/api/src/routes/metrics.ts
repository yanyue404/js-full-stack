import { Router } from 'express'
import { register } from '../lib/metrics.js'

/** 只在容器网络内给 Prometheus 抓取，Nginx 不对外暴露 */
export const metricsRouter = Router()

metricsRouter.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
