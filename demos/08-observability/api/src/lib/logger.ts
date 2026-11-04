import pino from 'pino'

const isProd = process.env.NODE_ENV === 'production'

// 开发环境美化输出，生产环境输出 JSON（交给日志平台检索）
export const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
  base: { service: 'api' },
  redact: ['req.headers.authorization', '*.password'],
  ...(isProd ? {} : { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } })
})
