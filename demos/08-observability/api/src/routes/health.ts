import { Router } from 'express'
import { sql } from 'drizzle-orm'
import { db } from '../db.js'
import { redis } from '../lib/redis.js'

type Status = 'up' | 'down' | 'disabled'

function withTimeout<T>(p: Promise<T>, ms = 1000) {
  return Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])
}

async function check(fn: () => Promise<unknown>): Promise<Status> {
  try {
    await withTimeout(fn())
    return 'up'
  } catch {
    return 'down'
  }
}

export const healthRouter = Router()

/** 轻量检查：DB select 1 + Redis PING，任一失败返回 503 */
healthRouter.get('/health', async (_req, res) => {
  const [dbStatus, redisStatus] = await Promise.all([
    check(() => db.execute(sql`select 1`)),
    redis ? check(() => redis!.ping()) : Promise.resolve<Status>('disabled')
  ])
  const ok = dbStatus === 'up' && redisStatus !== 'down'
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    checks: { db: dbStatus, redis: redisStatus },
    uptime: Math.round(process.uptime())
  })
})
