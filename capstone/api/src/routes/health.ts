import { Router } from 'express'
import { sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { register } from '../lib/metrics.js'

export const healthRouter = Router()

/** 就绪检查：数据库 1 秒内响应才算健康 */
healthRouter.get('/api/health', async (_req, res) => {
  const dbUp = await Promise.race([
    db.execute(sql`select 1`).then(() => true, () => false),
    new Promise<boolean>((r) => setTimeout(() => r(false), 1000))
  ])
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', db: dbUp ? 'up' : 'down', uptime: Math.round(process.uptime()) })
})

/** 只在容器网络内给 Prometheus 抓取，Nginx 不对外转发 */
healthRouter.get('/metrics', async (_req, res) => {
  res.set('Content-Type', register.contentType).end(await register.metrics())
})
