import { Redis } from 'ioredis'
import { logger } from './logger.js'
import { cacheRequestsTotal } from './metrics.js'

const log = logger.child({ module: 'cache' })

// 离线时命令立即失败而不是排队，缓存故障不能拖慢主流程
export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
  : null

redis?.on('error', (err) => log.warn({ err: err.message }, 'redis error'))

// ponytail: 未配置 REDIS_URL 时用进程内 Map 兜底（单实例可用），多实例部署必须上 Redis
const local = new Map<string, { value: string; expires: number }>()

async function rawGet(key: string) {
  if (redis) return redis.get(key)
  const hit = local.get(key)
  return hit && hit.expires > Date.now() ? hit.value : null
}

/** 缓存读失败按未命中处理（降级到数据库），绝不抛给调用方 */
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await rawGet(key)
      cacheRequestsTotal.inc({ result: raw ? 'hit' : 'miss' })
      log.debug({ key, hit: !!raw }, 'cache lookup')
      return raw ? (JSON.parse(raw) as T) : null
    } catch (err) {
      cacheRequestsTotal.inc({ result: 'error' })
      log.warn({ key, err: (err as Error).message }, 'cache get failed, fallback to db')
      return null
    }
  },

  async set(key: string, value: unknown, ttlSeconds = 3600) {
    const raw = JSON.stringify(value)
    try {
      if (redis) await redis.set(key, raw, 'EX', ttlSeconds)
      else local.set(key, { value: raw, expires: Date.now() + ttlSeconds * 1000 })
    } catch (err) {
      log.warn({ key, err: (err as Error).message }, 'cache set failed')
    }
  },

  async del(key: string) {
    try {
      if (redis) await redis.del(key)
      else local.delete(key)
    } catch (err) {
      log.warn({ key, err: (err as Error).message }, 'cache del failed')
    }
  }
}
