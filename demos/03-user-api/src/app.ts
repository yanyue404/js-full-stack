import express from 'express'
import cors from 'cors'
import { requestContext } from './middleware/requestContext.js'
import { errorHandler } from './middleware/errorHandler.js'
import authRouter from './routes/auth.js'
import usersRouter from './routes/users.js'

export function createApp() {
  const app = express()

  app.use(
    cors({
      origin: true,
      credentials: true
    })
  )
  app.use(express.json({ limit: '1mb' }))
  app.use(requestContext)

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
  })

  app.use('/api/auth', authRouter)
  app.use('/api/users', usersRouter)

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  app.use(errorHandler)

  return app
}
