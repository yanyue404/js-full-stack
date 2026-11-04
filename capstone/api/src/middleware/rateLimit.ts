import { rateLimit } from 'express-rate-limit'

const common = { standardHeaders: 'draft-7' as const, legacyHeaders: false }

// ponytail: 计数在进程内存，多实例部署时换 rate-limit-redis
export const authLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60_000,
  limit: 30,
  message: { error: '尝试次数过多，请 15 分钟后再试', code: 'RATE_LIMITED' }
})

/** AI 调用按用户限流：防止刷接口烧钱 */
export const aiLimiter = rateLimit({
  ...common,
  windowMs: 60_000,
  limit: 10,
  keyGenerator: (req) => req.user!.userId,
  message: { error: 'AI 调用太频繁，请稍后再试', code: 'RATE_LIMITED' }
})
