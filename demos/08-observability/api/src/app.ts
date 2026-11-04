import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { requestLogger } from './middleware/requestLogger.js'
import { metricsCollector } from './middleware/metricsCollector.js'
import { globalLimiter } from './middleware/rateLimiter.js'
import { healthRouter } from './routes/health.js'
import { metricsRouter } from './routes/metrics.js'
import { usersRouter } from './routes/users.js'

export const app = express()
// 在 Nginx 之后，用 X-Forwarded-For 取真实 IP（限流按 IP 计数）
app.set('trust proxy', 1)
app.use(cors())
app.use(express.json())
app.use(requestLogger)
app.use(metricsCollector)

app.use(metricsRouter)
app.use('/api', healthRouter)
app.use('/api', globalLimiter, usersRouter)

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err }, 'unhandled error')
  res.status(500).json({ error: 'Internal Server Error', requestId: req.requestId })
})
