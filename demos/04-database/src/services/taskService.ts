import { and, eq, inArray, isNull, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects, tasks, type TaskStatus } from '../db/schema.js'
import { ConflictError, NotFoundError } from '../errors.js'

/** tasks 表没有 tenant_id，通过所属 project 做租户隔离 */
function inTenant(tenantId: string) {
  return inArray(
    tasks.projectId,
    db.select({ id: projects.id }).from(projects).where(eq(projects.tenantId, tenantId))
  )
}

export const taskService = {
  async get(tenantId: string, taskId: string) {
    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, taskId), inTenant(tenantId), isNull(tasks.deletedAt)))
    if (!task) throw new NotFoundError(`任务 ${taskId} 不存在`)
    return task
  },

  /**
   * 场景 2：乐观锁。
   * UPDATE ... SET version = version + 1 WHERE id = ? AND version = ?
   * 影响 0 行 → 别人先改了 → 抛冲突错误，让调用方刷新后重试。
   */
  async updateStatus(tenantId: string, taskId: string, status: TaskStatus, expectedVersion: number) {
    const rows = await db
      .update(tasks)
      .set({ status, version: sql`${tasks.version} + 1` })
      .where(
        and(eq(tasks.id, taskId), eq(tasks.version, expectedVersion), inTenant(tenantId), isNull(tasks.deletedAt))
      )
      .returning()

    if (rows.length === 0) {
      const current = await this.get(tenantId, taskId)
      throw new ConflictError(
        `任务已被他人修改（你的版本 v${expectedVersion}，当前版本 v${current.version}），请刷新后重试`,
        current.version
      )
    }
    return rows[0]
  }
}
