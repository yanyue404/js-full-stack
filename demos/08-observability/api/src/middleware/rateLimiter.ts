import { rateLimit } from 'express-rate-limit'

// ponytail: 计数存在进程内存，多实例部署时换 rate-limit-redis 共享计数
export const globalLimiter = rateLimit({
  windowMs: 60_000,
  limit: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 100),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too Many Requests' }
})

/** 登录接口单独限流，防暴力破解 */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: '登录尝试过多，请 15 分钟后再试' }
})
