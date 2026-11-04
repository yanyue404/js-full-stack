/**
 * 运行 README 中的全部验证场景：pnpm db:setup && pnpm dev
 */
import assert from 'node:assert/strict'
import { eq } from 'drizzle-orm'
import { closeDb, db, queryStats } from './db/index.js'
import { projects, tasks } from './db/schema.js'
import { ConflictError } from './errors.js'
import { projectService } from './services/projectService.js'
import { taskService } from './services/taskService.js'
import { tenantService } from './services/tenantService.js'

async function step(name: string, fn: () => Promise<void>) {
  await fn()
  console.log(`✅ ${name}`)
}

async function main() {
  const acme = await tenantService.getBySlug('acme')
  const globex = await tenantService.getBySlug('globex')
  assert(acme && globex, '请先运行 pnpm db:setup')

  await step('种子数据：2 个租户，每个租户 2 个用户', async () => {
    assert.equal((await tenantService.listUsers(acme.id)).length, 2)
    assert.equal((await tenantService.listUsers(globex.id)).length, 2)
  })

  await step('多租户隔离：Acme 看不到 Globex 的项目', async () => {
    const [globexProject] = await projectService.listWithTasks(globex.id)
    const acmeList = await projectService.listWithTasks(acme.id)
    assert(acmeList.every((p) => p.tenantId === acme.id))
    await assert.rejects(projectService.getProjectWithTasks(acme.id, globexProject.id), /不存在/)
  })

  let projectId = ''
  await step('事务成功：project + 3 个默认任务', async () => {
    const p = await projectService.createProjectWithDefaults(acme.id, '事务演示项目')
    projectId = p.id
    assert.deepEqual(
      p.tasks.map((t) => t.title),
      ['计划', '执行', '复盘']
    )
  })

  await step('事务回滚：模拟失败后数据库无残留', async () => {
    const name = `回滚演示-${Date.now()}`
    await assert.rejects(projectService.createProjectWithDefaults(acme.id, name, { simulateFailure: true }), /模拟失败/)
    const left = await db.select().from(projects).where(eq(projects.name, name))
    assert.equal(left.length, 0)
  })

  await step('乐观锁：两人同时修改，后提交者收到冲突', async () => {
    const { tasks: list } = await projectService.getProjectWithTasks(acme.id, projectId)
    const task = list[0]
    // Alice 和 Bob 都读到了 version = 1
    const alice = await taskService.updateStatus(acme.id, task.id, 'in_progress', task.version)
    assert.equal(alice.version, task.version + 1)
    await assert.rejects(taskService.updateStatus(acme.id, task.id, 'done', task.version), (err) => {
      assert(err instanceof ConflictError)
      console.log(`   → ${err.message}`)
      return true
    })
  })

  await step('无 N+1：项目列表 + 全部任务只发 1 条 SQL', async () => {
    queryStats.count = 0
    const list = await projectService.listWithTasks(acme.id)
    assert(list.length >= 2 && list.every((p) => p.tasks.length > 0))
    assert.equal(queryStats.count, 1)
  })

  await step('软删除：删除后查不到，但记录仍在数据库', async () => {
    await projectService.softDelete(acme.id, projectId)
    await assert.rejects(projectService.getProjectWithTasks(acme.id, projectId), /不存在/)
    const [raw] = await db.select().from(projects).where(eq(projects.id, projectId))
    assert(raw.deletedAt instanceof Date)
    // 清理演示数据，保证脚本可重复运行
    await db.delete(tasks).where(eq(tasks.projectId, projectId))
    await db.delete(projects).where(eq(projects.id, projectId))
  })

  console.log('\n全部场景通过 🎉')
}

main()
  .catch((err) => {
    console.error('❌', err)
    process.exitCode = 1
  })
  .finally(closeDb)
