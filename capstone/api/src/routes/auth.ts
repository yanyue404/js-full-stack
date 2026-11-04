import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { and, asc, eq, isNull } from 'drizzle-orm'
import { z } from 'zod'
import { db, isUniqueViolation } from '../db/index.js'
import { users, workspaces } from '../db/schema.js'
import { currentUser, requireAuth, requireRole, signToken } from '../lib/auth.js'
import { HttpError, parse } from '../lib/errors.js'
import { authLimiter } from '../middleware/rateLimit.js'

const email = z.string().trim().toLowerCase().email()
const password = z.string().min(8, '密码至少 8 位').max(72)
const name = z.string().trim().min(1).max(50)

const registerInput = z.object({ workspaceName: name, name, email, password })
const loginInput = z.object({ email, password: z.string().min(1) })
const memberInput = z.object({ name, email, password })

const publicUser = { id: users.id, name: users.name, email: users.email, role: users.role, workspaceId: users.workspaceId }

async function createUser(values: typeof users.$inferInsert, tx: Pick<typeof db, 'insert'> = db) {
  try {
    const [u] = await tx.insert(users).values(values).returning(publicUser)
    return u
  } catch (err) {
    if (isUniqueViolation(err)) throw new HttpError(409, '该邮箱已注册', 'EMAIL_EXISTS')
    throw err
  }
}

export const authRouter = Router()

/** 注册 = 创建工作区 + 创建 owner，放在一个事务里 */
authRouter.post('/api/auth/register', authLimiter, async (req, res) => {
  const input = parse(registerInput, req.body)
  const passwordHash = await bcrypt.hash(input.password, 10)
  const user = await db.transaction(async (tx) => {
    const [ws] = await tx.insert(workspaces).values({ name: input.workspaceName }).returning()
    return createUser({ workspaceId: ws.id, name: input.name, email: input.email, role: 'owner', passwordHash }, tx)
  })
  req.log.info({ userId: user.id, workspaceId: user.workspaceId }, 'workspace registered')
  res.status(201).json({ token: signToken({ userId: user.id, workspaceId: user.workspaceId, role: user.role }), user })
})

authRouter.post('/api/auth/login', authLimiter, async (req, res) => {
  const input = parse(loginInput, req.body)
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.email, input.email), isNull(users.deletedAt)))
  // 用户不存在和密码错误返回同样的信息，避免枚举邮箱
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    req.log.warn({ email: input.email }, 'login failed')
    throw new HttpError(401, '邮箱或密码错误', 'INVALID_CREDENTIALS')
  }
  const { passwordHash: _, deletedAt: __, createdAt: ___, ...safe } = user
  res.json({ token: signToken({ userId: user.id, workspaceId: user.workspaceId, role: user.role }), user: safe })
})

authRouter.get('/api/me', requireAuth, async (req, res) => {
  const me = currentUser(req)
  const [user] = await db.select(publicUser).from(users).where(eq(users.id, me.userId))
  const [ws] = await db.select().from(workspaces).where(eq(workspaces.id, me.workspaceId))
  if (!user) throw new HttpError(401, '用户不存在', 'UNAUTHORIZED')
  res.json({ user, workspace: ws })
})

authRouter.get('/api/members', requireAuth, async (req, res) => {
  res.json(
    await db
      .select(publicUser)
      .from(users)
      .where(and(eq(users.workspaceId, currentUser(req).workspaceId), isNull(users.deletedAt)))
      .orderBy(asc(users.createdAt))
  )
})

/** 只有 owner 能邀请成员（RBAC） */
authRouter.post('/api/members', requireAuth, requireRole('owner'), async (req, res) => {
  const input = parse(memberInput, req.body)
  const user = await createUser({
    workspaceId: currentUser(req).workspaceId,
    name: input.name,
    email: input.email,
    role: 'member',
    passwordHash: await bcrypt.hash(input.password, 10)
  })
  res.status(201).json(user)
})
