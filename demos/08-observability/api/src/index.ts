import { app } from './app.js'
import { ensureSchema } from './db.js'
import { logger } from './lib/logger.js'

const port = Number(process.env.PORT ?? 8080)

await ensureSchema()
const server = app.listen(port, () => logger.info({ port }, 'API listening'))

// 优雅停机：先停止接收新请求，处理完存量请求再退出
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down')
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
