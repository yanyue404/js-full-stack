import client from 'prom-client'

export const register = new client.Registry()
client.collectDefaultMetrics({ register })

export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP 请求耗时',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 0.5, 1, 3],
  registers: [register]
})

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP 请求总数',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
})

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: '数据库查询耗时',
  labelNames: ['operation'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register]
})

export const cacheRequestsTotal = new client.Counter({
  name: 'cache_requests_total',
  help: '缓存命中情况',
  labelNames: ['result'],
  registers: [register]
})

/** 包一层数据库调用，记录耗时 */
export async function timed<T>(operation: string, fn: () => Promise<T>): Promise<T> {
  const end = dbQueryDuration.startTimer({ operation })
  try {
    return await fn()
  } finally {
    end()
  }
}
