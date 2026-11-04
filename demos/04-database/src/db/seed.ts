import bcrypt from 'bcryptjs'
import { closeDb, db } from './index.js'
import { projects, tasks, tenants, users } from './schema.js'
import { projectService } from '../services/projectService.js'

const SEED = [
  {
    tenant: { name: 'Acme 科技', slug: 'acme', plan: 'pro' as const },
    users: [
      { email: 'alice@acme.com', name: 'Alice', role: 'owner' as const },
      { email: 'bob@acme.com', name: 'Bob', role: 'member' as const }
    ],
    project: 'Acme 官网改版'
  },
  {
    tenant: { name: 'Globex 集团', slug: 'globex', plan: 'free' as const },
    users: [
      { email: 'carol@globex.com', name: 'Carol', role: 'owner' as const },
      { email: 'dave@globex.com', name: 'Dave', role: 'admin' as const }
    ],
    project: 'Globex 内部 OA'
  }
]

async function seed() {
  // 可重复执行：先按外键依赖倒序清空
  await db.delete(tasks)
  await db.delete(projects)
  await db.delete(users)
  await db.delete(tenants)

  const passwordHash = await bcrypt.hash('password123', 10)
  for (const item of SEED) {
    const [tenant] = await db.insert(tenants).values(item.tenant).returning()
    await db.insert(users).values(item.users.map((u) => ({ ...u, tenantId: tenant.id, passwordHash })))
    await projectService.createProjectWithDefaults(tenant.id, item.project)
    console.log(`✓ 租户 ${tenant.slug}: ${item.users.length} 个用户, 1 个项目`)
  }
}

seed()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(closeDb)
