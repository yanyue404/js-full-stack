import { Router } from 'express'
import { desc, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db, users } from '../db.js'
import { cache } from '../lib/redis.js'
import { timed } from '../lib/metrics.js'
import { loginLimiter } from '../middleware/rateLimiter.js'

type User = typeof users.$inferSelect

const createInput = z.object({ name: z.string().trim().min(1).max(50), email: z.string().trim().email() })
const patchInput = createInput.partial()
const uuid = z.string().uuid()
const cacheKey = (id: string) => `user:${id}`

export const usersRouter = Router()

usersRouter.get('/users', async (_req, res) => {
  res.json(await timed('users.list', () => db.select().from(users).orderBy(desc(users.createdAt)).limit(100)))
})

/** 先查 Redis → 未命中查 DB → 回写 Redis（TTL 1 小时） */
usersRouter.get('/users/:id', async (req, res) => {
  const id = uuid.safeParse(req.params.id)
  if (!id.success) return void res.status(400).json({ error: 'Invalid id' })

  const cached = await cache.get<User>(cacheKey(id.data))
  if (cached) {
    req.log.info({ userId: id.data, cache: 'hit' }, 'user from cache')
    return void res.set('X-Cache', 'HIT').json(cached)
  }

  const [user] = await timed('users.get', () => db.select().from(users).where(eq(users.id, id.data)))
  if (!user) return void res.status(404).json({ error: 'User not found' })
  await cache.set(cacheKey(user.id), user, 3600)
  req.log.info({ userId: user.id, cache: 'miss' }, 'user from db')
  res.set('X-Cache', 'MISS').json(user)
})

usersRouter.post('/users', async (req, res) => {
  const parsed = createInput.safeParse(req.body)
  if (!parsed.success) return void res.status(400).json({ error: 'Validation failed', detail: parsed.error.flatten() })
  const [user] = await timed('users.insert', () =>
    db.insert(users).values(parsed.data).onConflictDoNothing({ target: users.email }).returning()
  )
  if (!user) return void res.status(409).json({ error: 'Email already exists' })
  req.log.info({ userId: user.id }, 'user created')
  res.status(201).json(user)
})

/** 更新 DB → 删除缓存（Cache Aside），下次读取再回填 */
usersRouter.patch('/users/:id', async (req, res) => {
  const id = uuid.safeParse(req.params.id)
  const parsed = patchInput.safeParse(req.body)
  if (!id.success || !parsed.success) return void res.status(400).json({ error: 'Validation failed' })
  const [user] = await timed('users.update', () =>
    db.update(users).set(parsed.data).where(eq(users.id, id.data)).returning()
  )
  if (!user) return void res.status(404).json({ error: 'User not found' })
  await cache.del(cacheKey(user.id))
  res.json(user)
})

// ponytail: 只演示登录限流，真实鉴权（密码 + JWT）见练习 3
usersRouter.post('/auth/login', loginLimiter, async (req, res) => {
  const email = z.string().email().safeParse(req.body?.email)
  if (!email.success) return void res.status(400).json({ error: 'Invalid email' })
  const [user] = await timed('users.byEmail', () => db.select().from(users).where(eq(users.email, email.data)))
  if (!user) {
    req.log.warn({ email: email.data }, 'login failed')
    return void res.status(401).json({ error: 'Invalid credentials' })
  }
  res.json({ userId: user.id })
})
