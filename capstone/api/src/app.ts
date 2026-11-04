import express, { type NextFunction, type Request, type Response } from 'express'
import { HttpError } from './lib/errors.js'
import { observability } from './middleware/observability.js'
import { authRouter } from './routes/auth.js'
import { healthRouter } from './routes/health.js'
import { tasksRouter } from './routes/tasks.js'

export const app = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')
app.use(express.json({ limit: '100kb' }))
app.use(observability)

// 路由内写完整路径而不是 app.use('/api', router)：出错时 req.baseUrl 会被还原，指标标签会丢前缀
app.use(healthRouter, authRouter, tasksRouter)

app.use((_req, _res) => {
  throw new HttpError(404, '接口不存在', 'NOT_FOUND')
})

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: err.code, detail: err.detail })
    return
  }
  // express.json 的非法 JSON / 超大请求体
  const status = (err as { status?: number }).status
  if (status && status < 500) {
    res.status(status).json({ error: err.message, code: 'BAD_REQUEST' })
    return
  }
  req.log.error({ err }, 'unhandled error')
  res.status(500).json({ error: '服务器内部错误', code: 'INTERNAL', requestId: req.requestId })
})
