# 练习 4：多租户 SaaS 数据模型

为一个简单的项目管理 SaaS 设计并实现数据库层，涵盖建模、事务和并发控制。

## 目标

掌握 PostgreSQL + Drizzle ORM 的完整使用，理解事务、乐观锁、软删除和多租户隔离在真实项目中的应用。

## 要求

1. 使用 Drizzle ORM + PostgreSQL（Docker 运行）
2. 实现多租户隔离（通过 tenant_id 字段）
3. 表设计：tenants / users / projects / tasks
4. 所有表包含审计字段（created_at / updated_at / deleted_at）
5. 编写 migration 和 seed 脚本
6. 实现基本的 CRUD Service 层
7. 用事务实现"创建项目并自动创建默认任务"
8. 用乐观锁处理"多人同时修改同一任务"

## 快速开始

```bash
mkdir saas-db && cd saas-db
pnpm init

# 安装依赖
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit typescript tsx @types/node

# 初始化 TypeScript
npx tsc --init

# 启动 PostgreSQL
docker run --name pg-saas \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=saas \
  -p 5432:5432 \
  -v pg-saas-data:/var/lib/postgresql/data \
  -d postgres:16-alpine
```

## 数据模型

```
tenants
├── id (UUID, PK)
├── name
├── slug (unique)
├── plan ('free' | 'pro' | 'enterprise')
└── 审计字段

users
├── id (UUID, PK)
├── tenant_id (FK → tenants)
├── email (unique within tenant)
├── name
├── role ('owner' | 'admin' | 'member')
├── password_hash
└── 审计字段

projects
├── id (UUID, PK)
├── tenant_id (FK → tenants)
├── name
├── description
├── status ('active' | 'archived')
└── 审计字段

tasks
├── id (UUID, PK)
├── project_id (FK → projects)
├── title
├── description
├── status ('todo' | 'in_progress' | 'done')
├── assignee_id (FK → users, nullable)
├── due_date (nullable)
├── version (integer, 乐观锁)
└── 审计字段
```

## 项目结构

```
src/
├── db/
│   ├── schema.ts         # Drizzle schema 定义
│   ├── index.ts           # 数据库连接
│   └── seed.ts            # 种子数据
├── services/
│   ├── tenantService.ts
│   ├── projectService.ts  # 含事务：创建项目 + 默认任务
│   └── taskService.ts     # 含乐观锁：更新任务
└── index.ts               # 运行测试
drizzle.config.ts
```

## 必须实现的三个场景

### 场景 1：创建项目（事务）

```ts
// 创建 project + 3 个默认任务（"计划"、"执行"、"复盘"）
// 任何一步失败全部回滚
async function createProjectWithDefaults(tenantId: string, name: string) {
  return db.transaction(async (tx) => {
    // 1. 创建 project
    // 2. 批量创建 3 个默认 tasks
    // 如果任一步失败 → 自动回滚
  })
}
```

### 场景 2：更新任务状态（乐观锁）

```ts
// 两个人同时修改同一任务的状态
// 后提交的人收到冲突提示
async function updateTaskStatus(taskId: string, newStatus: string, currentVersion: number) {
  // UPDATE ... SET status = ?, version = version + 1
  // WHERE id = ? AND version = ?
  // 如果 rowCount === 0 → 抛出冲突错误
}
```

### 场景 3：查询项目及其所有任务（避免 N+1）

```ts
// 一次查询返回项目和关联任务
async function getProjectWithTasks(projectId: string) {
  return db.query.projects.findFirst({
    where: eq(projects.id, projectId),
    with: { tasks: true }
  })
}
```

## 常用命令

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "db:setup": "pnpm db:migrate && pnpm db:seed",
    "dev": "tsx src/index.ts"
  }
}
```

## 验证标准

- [ ] `pnpm db:setup` 一键初始化数据库（migrate + seed）
- [ ] 种子数据正确插入（至少 2 个租户、每个租户 2 个用户）
- [ ] 多租户查询正确隔离（租户 A 看不到租户 B 的数据）
- [ ] 创建项目事务正确（成功时 project + 3 tasks 都存在）
- [ ] 创建项目事务回滚正确（模拟失败时数据库无残留）
- [ ] 乐观锁冲突时返回明确错误信息
- [ ] 列表查询无 N+1 问题
- [ ] 软删除生效（删除后查不到，但数据库中记录仍在）

## 提示

- 使用 `drizzle-kit studio` 可以可视化查看数据库内容
- seed 脚本里可以用 `bcrypt` 对密码做哈希
- 多租户隔离的关键：每个查询都要带 `WHERE tenant_id = ?`
- 乐观锁不需要 `FOR UPDATE`，只需要 `WHERE version = ?`
