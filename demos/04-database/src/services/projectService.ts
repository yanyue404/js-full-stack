import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { projects, tasks } from '../db/schema.js'
import { NotFoundError } from '../errors.js'

const DEFAULT_TASKS = ['计划', '执行', '复盘']

const aliveTasks = { where: isNull(tasks.deletedAt), orderBy: [tasks.createdAt] }

export const projectService = {
  /**
   * 场景 1：事务。project + 3 个默认任务要么全部成功，要么全部回滚。
   * simulateFailure 用来演示回滚：在插入任务后故意抛错。
   */
  createProjectWithDefaults(
    tenantId: string,
    name: string,
    opts: { description?: string; simulateFailure?: boolean } = {}
  ) {
    return db.transaction(async (tx) => {
      const [project] = await tx
        .insert(projects)
        .values({ tenantId, name, description: opts.description })
        .returning()

      const created = await tx
        .insert(tasks)
        .values(DEFAULT_TASKS.map((title) => ({ projectId: project.id, title })))
        .returning()

      if (opts.simulateFailure) throw new Error('模拟失败：触发事务回滚')

      return { ...project, tasks: created }
    })
  },

  /** 场景 3：列表 + 关联任务，Drizzle 关系查询生成单条 SQL，避免 N+1 */
  listWithTasks(tenantId: string) {
    return db.query.projects.findMany({
      where: and(eq(projects.tenantId, tenantId), isNull(projects.deletedAt)),
      orderBy: [desc(projects.createdAt)],
      with: { tasks: aliveTasks }
    })
  },

  async getProjectWithTasks(tenantId: string, projectId: string) {
    const project = await db.query.projects.findFirst({
      where: and(eq(projects.id, projectId), eq(projects.tenantId, tenantId), isNull(projects.deletedAt)),
      with: { tasks: aliveTasks }
    })
    if (!project) throw new NotFoundError(`项目 ${projectId} 不存在`)
    return project
  },

  /** 软删除：只打 deleted_at 标记，数据仍在 */
  async softDelete(tenantId: string, projectId: string) {
    const rows = await db
      .update(projects)
      .set({ deletedAt: new Date() })
      .where(and(eq(projects.id, projectId), eq(projects.tenantId, tenantId), isNull(projects.deletedAt)))
      .returning({ id: projects.id })
    if (rows.length === 0) throw new NotFoundError(`项目 ${projectId} 不存在`)
  }
}
