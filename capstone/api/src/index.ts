import { app } from './app.js'
import { config } from './config.js'
import { closeDb, migrateDb } from './db/index.js'
import { logger } from './lib/logger.js'

await migrateDb()
const server = app.listen(config.port, () => logger.info({ port: config.port, env: config.env }, 'API listening'))

// 优雅停机：停止接收新请求 → 处理完存量请求 → 关闭连接池
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    logger.info({ signal }, 'shutting down')
    server.close(async () => {
      await closeDb()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10_000).unref()
  })
}
