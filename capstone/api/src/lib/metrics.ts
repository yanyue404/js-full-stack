import client from 'prom-client'

export const register = new client.Registry()
client.collectDefaultMetrics({ register })

export const httpDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP 请求耗时',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.005, 0.01, 0.05, 0.1, 0.3, 1, 3, 10],
  registers: [register]
})

export const httpTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP 请求总数',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
})

export const aiBreakdownTotal = new client.Counter({
  name: 'ai_breakdown_total',
  help: 'AI 任务拆解调用次数（source=ai 为模型生成，fallback 为规则兜底）',
  labelNames: ['source'],
  registers: [register]
})
