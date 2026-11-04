import pino from 'pino'
import { config } from '../config.js'

export const logger = pino({
  level: config.logLevel,
  base: { service: 'teamboard-api' },
  redact: ['req.headers.authorization', '*.password', '*.passwordHash'],
  ...(config.env === 'development'
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss' } } }
    : {})
})
