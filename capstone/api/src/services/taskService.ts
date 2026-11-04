import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { tasks, users } from '../db/schema.js'
import type { AuthUser } from '../lib/auth.js'
import { HttpError } from '../lib/errors.js'

export interface TaskInput {
  title: string
  description?: string | null
  priority?: 'low' | 'medium' | 'high'
  status?: 'todo' | 'doing' | 'done'
  assigneeId?: string | null
  dueDate?: string | null
}

const alive = (workspaceId: string) => and(eq(tasks.workspaceId, workspaceId), isNull(tasks.deletedAt))

/** 多租户：被指派人必须属于同一个工作区，否则就是越权引用别人的数据 */
async function assertMember(workspaceId: string, userId: string | null | undefined) {
  if (!userId) return
  const [u] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.workspaceId, workspaceId), isNull(users.deletedAt)))
  if (!u) throw new HttpError(400, '被指派人不在当前工作区', 'INVALID_ASSIGNEE')
}

async function findAlive(workspaceId: string, id: string) {
  return db.query.tasks.findFirst({
    where: and(eq(tasks.id, id), alive(workspaceId)),
    with: { assignee: { columns: { id: true, name: true } } }
  })
}

export const taskService = {
  /** 关系查询一次带出被指派人，避免 N+1 */
  list(workspaceId: string) {
    return db.query.tasks.findMany({
      where: alive(workspaceId),
      orderBy: [desc(tasks.createdAt)],
      with: { assignee: { columns: { id: true, name: true } } }
    })
  },

  async create(user: AuthUser, input: TaskInput, source: 'manual' | 'ai' = 'manual') {
    await assertMember(user.workspaceId, input.assigneeId)
    const [task] = await db
      .insert(tasks)
      .values({ ...input, workspaceId: user.workspaceId, createdBy: user.userId, source })
      .returning()
    return (await findAlive(user.workspaceId, task.id))!
  },

  /** 批量创建（AI 拆解结果）：事务内全部成功或全部回滚 */
  async createMany(user: AuthUser, inputs: TaskInput[], source: 'manual' | 'ai') {
    for (const id of new Set(inputs.map((i) => i.assigneeId))) await assertMember(user.workspaceId, id)
    const rows = await db.transaction((tx) =>
      tx
        .insert(tasks)
        .values(inputs.map((i) => ({ ...i, workspaceId: user.workspaceId, createdBy: user.userId, source })))
        .returning({ id: tasks.id })
    )
    return rows.length
  },

  /** 乐观锁：WHERE version = 客户端看到的版本；影响 0 行说明别人先改了 */
  async update(user: AuthUser, id: string, patch: Partial<TaskInput>, version: number) {
    if (patch.assigneeId !== undefined) await assertMember(user.workspaceId, patch.assigneeId)
    const rows = await db
      .update(tasks)
      .set({ ...patch, version: sql`${tasks.version} + 1` })
      .where(and(eq(tasks.id, id), alive(user.workspaceId), eq(tasks.version, version)))
      .returning({ id: tasks.id })

    if (rows.length === 0) {
      const current = await findAlive(user.workspaceId, id)
      if (!current) throw new HttpError(404, '任务不存在', 'NOT_FOUND')
      throw new HttpError(409, '任务已被其他人修改，请刷新后重试', 'VERSION_CONFLICT', current)
    }
    return (await findAlive(user.workspaceId, id))!
  },

  /** 软删除：只有创建者或 owner 可以删 */
  async remove(user: AuthUser, id: string) {
    const task = await findAlive(user.workspaceId, id)
    if (!task) throw new HttpError(404, '任务不存在', 'NOT_FOUND')
    if (user.role !== 'owner' && task.createdBy !== user.userId) {
      throw new HttpError(403, '只有创建者或负责人可以删除任务', 'FORBIDDEN')
    }
    await db.update(tasks).set({ deletedAt: new Date() }).where(eq(tasks.id, id))
  }
}
