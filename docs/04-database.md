# 第四讲：数据库与数据建模

> 理解关系型数据库，掌握从建模到运维的全流程。

## 写在前面：为什么前端工程师要学数据库

你在前端调用的每一个 API，背后几乎都在和数据库打交道。理解数据库，就能理解：

- 为什么列表接口要分页（不分页数据库会把所有数据加载到内存）
- 为什么"秒杀"会超卖（并发操作同一行数据）
- 为什么删除操作不是真删（软删除用于数据恢复和审计）
- 为什么有时候接口很慢（没有索引，全表扫描）

**类比：** 如果把后端比作一家餐厅，数据库就是厨房里的冰箱和仓库——API 负责接单和上菜，但食材（数据）全在数据库里。

## 1. PostgreSQL 基础与 SQL 语法

### 1.1 为什么选 PostgreSQL

| 特性         | PostgreSQL         | MySQL              | SQLite             |
| ------------ | ------------------ | ------------------ | ------------------ |
| JSON 支持    | 原生 JSONB，可索引 | JSON 类型，功能弱  | 无                 |
| 全文搜索     | 内置               | 需要额外配置       | 无                 |
| 事务隔离     | 完整 4 级          | 完整 4 级          | 有限               |
| 并发性能     | MVCC，读写不阻塞   | 部分引擎行锁       | 全库锁             |
| 扩展性       | 支持自定义类型/函数 | 有限               | 无                 |
| 云厂商支持   | 全面               | 全面               | 不适合服务端       |
| 适合场景     | 生产级全栈应用      | Web 应用           | 嵌入式/本地开发    |

### 1.2 Docker 启动 PostgreSQL

```bash
docker run --name pg-dev \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  -v pg-data:/var/lib/postgresql/data \
  -d postgres:16
```

连接数据库（使用 psql 命令行或 TablePlus 等 GUI 工具）：

```bash
docker exec -it pg-dev psql -U admin -d myapp
```

### 1.3 SQL 基础 —— 从前端角度理解

如果你用过 JavaScript 数组方法，SQL 对你来说并不陌生：

```
JavaScript 数组方法              SQL 等价
────────────────────────────     ────────────────────────────
users.filter(u => u.active)     SELECT * FROM users WHERE active = true
users.map(u => u.name)          SELECT name FROM users
users.sort((a,b) => b.age-a.age)   ORDER BY age DESC
users.slice(0, 20)              LIMIT 20
users.slice(20, 40)             LIMIT 20 OFFSET 20
users.length                    SELECT count(*) FROM users
users.find(u => u.id === '1')   SELECT * FROM users WHERE id = '1'
```

### 1.4 完整 CRUD SQL

```sql
-- 建表
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

-- 插入（Create）
INSERT INTO users (email, name, password_hash)
VALUES ('alice@example.com', 'Alice', '$2b$12$...')
RETURNING id, email, name, role, created_at;
-- RETURNING：插入后立即返回新记录，省一次查询（PostgreSQL 特有）

-- 查询（Read）
-- 单条
SELECT id, email, name, role, created_at
FROM users
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
  AND deleted_at IS NULL;

-- 列表 + 分页 + 搜索
SELECT id, email, name, role, created_at
FROM users
WHERE deleted_at IS NULL
  AND (name ILIKE '%alice%' OR email ILIKE '%alice%')  -- ILIKE = 不区分大小写模糊匹配
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;

-- 更新（Update）
UPDATE users
SET name = 'Alice Wang', updated_at = NOW()
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
  AND deleted_at IS NULL
RETURNING id, email, name;

-- 软删除（Delete）
UPDATE users SET deleted_at = NOW() WHERE id = '...';
```

### 1.5 关联查询（JOIN）

```sql
-- 先建一个文章表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  author_id UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LEFT JOIN：查询用户及其文章数量
-- 即使用户没有文章，也会返回（文章数为 0）
SELECT u.id, u.name, COUNT(p.id) AS post_count
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
WHERE u.deleted_at IS NULL
GROUP BY u.id, u.name
ORDER BY post_count DESC;
```

**JOIN 类型速记：**

```
INNER JOIN  = 两边都匹配才返回     → 类似 JS 的 filter + 交集
LEFT JOIN   = 左表全返回，右表没匹配则为 NULL → 常用
RIGHT JOIN  = 右表全返回（很少用）
FULL JOIN   = 两边都全返回（很少用）
```

### 1.6 常用查询技巧

```sql
-- CTE（公共表表达式）—— 把复杂查询拆成可读的步骤
WITH active_users AS (
  SELECT id, name, email FROM users WHERE deleted_at IS NULL
),
user_post_counts AS (
  SELECT author_id, COUNT(*) AS cnt FROM posts GROUP BY author_id
)
SELECT au.name, au.email, COALESCE(upc.cnt, 0) AS post_count
FROM active_users au
LEFT JOIN user_post_counts upc ON upc.author_id = au.id;

-- 窗口函数 —— 不改变行数的聚合
SELECT name, role, created_at,
  ROW_NUMBER() OVER (PARTITION BY role ORDER BY created_at) AS rank_in_role,
  COUNT(*) OVER (PARTITION BY role) AS total_in_role
FROM users
WHERE deleted_at IS NULL;

-- JSONB —— PostgreSQL 的杀手级特性，结构化存储不确定的数据
ALTER TABLE users ADD COLUMN preferences JSONB DEFAULT '{}';

UPDATE users SET preferences = '{"theme": "dark", "language": "zh-CN"}' WHERE id = '...';

SELECT * FROM users WHERE preferences->>'theme' = 'dark';
```

## 2. 数据建模与表设计

### 2.1 建模思路 —— 从业务到表结构

**第一步：识别实体。** 问自己"系统里有哪些'东西'？"

```
电商系统：用户、商品、订单、订单项、地址、支付记录
博客系统：用户、文章、评论、标签、分类
项目管理：租户、用户、项目、任务、评论
```

**第二步：确定关系。** 实体之间如何关联？

```
一对一（1:1）：用户 ↔ 用户资料
一对多（1:N）：用户 → 文章（一个用户写多篇文章）
多对多（M:N）：文章 ↔ 标签（一篇文章多个标签，一个标签多篇文章）
```

**第三步：翻译成表结构。**

```sql
-- 一对多 —— 在"多"的一方加外键
-- 一个用户 → 多篇文章
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  content TEXT,
  author_id UUID NOT NULL REFERENCES users(id),  -- 外键指向 users
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 多对多 —— 创建中间表
-- 文章 ↔ 标签
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);

-- 一对一 —— 外键同时也是主键
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  avatar_url TEXT,
  bio TEXT,
  location VARCHAR(100)
);
```

### 2.2 设计原则

| 原则         | 说明                                     | 例子                                     |
| ------------ | ---------------------------------------- | ---------------------------------------- |
| UUID 主键    | 分布式安全，不暴露业务信息               | `gen_random_uuid()` 而非自增 ID          |
| 软删除       | `deleted_at` 字段，不物理删除            | 用于数据恢复、审计                       |
| 审计字段     | 每张表都要有 `created_at` + `updated_at` | 方便排查问题                             |
| 适当冗余     | 高频读取场景可以冗余字段减少 JOIN        | 订单表冗余商品名称（下单时快照）         |
| NOT NULL     | 尽量 NOT NULL + 默认值，避免 NULL 带来的三值逻辑 | `role VARCHAR(20) DEFAULT 'user'` |

### 2.3 索引 —— 数据库的"目录"

**没有索引：** 查 100 万条数据中的一条 = 逐页翻书找一个词 → 几秒
**有索引：** = 翻书后面的索引页，直接定位 → 几毫秒

```sql
-- 单列索引 —— 加速 WHERE 条件查询
CREATE INDEX idx_users_email ON users(email);

-- 复合索引 —— 同时加速多个条件（注意列顺序遵循最左前缀原则）
CREATE INDEX idx_posts_author_created ON posts(author_id, created_at DESC);
-- 能加速：WHERE author_id = ? AND created_at > ?
-- 能加速：WHERE author_id = ?
-- 不能加速：WHERE created_at > ?（没有最左列 author_id）

-- 部分索引 —— 只为满足条件的行建索引（节省空间）
CREATE INDEX idx_users_active_email ON users(email) WHERE deleted_at IS NULL;

-- 唯一索引 —— 确保数据唯一性（UNIQUE 字段自动创建）
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
```

**什么时候需要加索引？**
- WHERE 条件中频繁使用的列
- JOIN 的关联列（外键）
- ORDER BY 排序列
- 查询慢日志显示全表扫描（Seq Scan）的列

**不要盲目加索引：** 索引会减慢写入速度（INSERT/UPDATE 需要同时更新索引），占用额外磁盘空间。

## 3. Drizzle ORM 使用

### 3.1 ORM 是什么

ORM（Object-Relational Mapping）把数据库表映射为 TypeScript 对象，让你用 TS 写查询而不是手写 SQL：

```
手写 SQL：  SELECT * FROM users WHERE email = 'alice@example.com'
Drizzle：   db.select().from(users).where(eq(users.email, 'alice@example.com'))
```

好处：类型安全、自动补全、防 SQL 注入。

### 3.2 安装与配置

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

```ts
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! }
})
```

### 3.3 Schema 定义

```ts
// src/db/schema.ts
import { pgTable, uuid, varchar, text, timestamp, integer } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 20 }).default('user').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
})

export const posts = pgTable('posts', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: varchar('title', { length: 200 }).notNull(),
  content: text('content'),
  authorId: uuid('author_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// 定义关系（用于 Relational Query API）
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts)
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] })
}))
```

### 3.4 数据库连接与完整 CRUD

```ts
// src/db/index.ts
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const client = postgres(process.env.DATABASE_URL!)
export const db = drizzle(client, { schema })
```

```ts
// services/userService.ts
import { db } from '../db'
import { users } from '../db/schema'
import { eq, isNull, ilike, or, desc, sql } from 'drizzle-orm'

export const userService = {
  // 查列表（分页 + 搜索）
  async findAll({ page, limit, search }: { page: number; limit: number; search?: string }) {
    const offset = (page - 1) * limit

    const conditions = [isNull(users.deletedAt)]
    if (search) {
      conditions.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!)
    }

    const where = conditions.length > 1 ? and(...conditions) : conditions[0]

    const [items, [{ count }]] = await Promise.all([
      db.select({
        id: users.id, email: users.email, name: users.name,
        role: users.role, createdAt: users.createdAt
      })
        .from(users).where(where)
        .orderBy(desc(users.createdAt))
        .offset(offset).limit(limit),
      db.select({ count: sql<number>`count(*)` }).from(users).where(where)
    ])

    return {
      items,
      pagination: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) }
    }
  },

  // 查单条
  async findById(id: string) {
    return db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
      columns: { passwordHash: false }
    })
  },

  // 查单条（含关联数据）
  async findByIdWithPosts(id: string) {
    return db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
      columns: { passwordHash: false },
      with: { posts: { orderBy: (posts, { desc }) => [desc(posts.createdAt)], limit: 10 } }
    })
  },

  // 创建
  async create(data: { email: string; name: string; passwordHash: string }) {
    const [user] = await db.insert(users).values(data).returning({
      id: users.id, email: users.email, name: users.name, role: users.role, createdAt: users.createdAt
    })
    return user
  },

  // 更新
  async update(id: string, data: Partial<{ name: string; email: string }>) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning({ id: users.id, email: users.email, name: users.name, role: users.role })
    return updated || null
  },

  // 软删除
  async softDelete(id: string) {
    await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id))
  }
}
```

## 4. 事务 —— 数据安全的基石

这是数据库中**最核心**的概念，也是前端同学最陌生的领域。

### 4.1 为什么需要事务？用一个故事理解

**场景：用户购买商品**

需要执行两个操作：
1. 扣减商品库存 (stock - 1)
2. 创建订单记录

**没有事务的灾难：**

```
操作 1 成功：库存从 10 变成 9  ✅
操作 2 失败：订单创建失败      ❌（数据库连接断了）

结果：库存扣了，但没有订单记录
      → 商品"消失"了，用户没买到，卖家也没卖出去
      → 数据不一致，靠人工修复
```

**有事务：** 要么两个操作都成功，要么都不生效（回滚到操作前的状态）。

### 4.2 ACID —— 事务的四大保证

```
A — Atomicity    原子性    "全有或全无"
    事务中的操作要么全部成功提交，要么全部回滚。不存在"做了一半"的状态。
    类比：银行转账，扣款和到账必须同时发生。

C — Consistency  一致性    "从一个正确状态到另一个正确状态"
    事务执行前后，数据都满足业务规则（约束、外键、唯一性等）。
    类比：转账后两个账户总金额不变。

I — Isolation    隔离性    "并发事务互不干扰"
    多个事务同时执行时，每个事务看到的数据就像只有自己在操作一样。
    类比：两个柜员同时处理不同客户的转账，互不影响。

D — Durability   持久性    "提交了就不会丢"
    事务一旦提交成功，数据就持久保存到磁盘，即使断电也不会丢失。
    类比：合同签字盖章后，即使办公室着火，备份还在。
```

### 4.3 事务的基本使用

```ts
// Drizzle ORM 事务
await db.transaction(async (tx) => {
  // tx 是事务上下文，在这个回调里的所有操作都在同一个事务中

  // 操作 1：扣库存
  const [product] = await tx
    .update(products)
    .set({ stock: sql`stock - ${quantity}` })
    .where(and(eq(products.id, productId), gte(products.stock, quantity)))
    .returning()

  // 如果库存不足，抛异常 → 自动回滚
  if (!product) {
    throw new Error('Insufficient stock')
  }

  // 操作 2：创建订单
  const [order] = await tx
    .insert(orders)
    .values({
      userId,
      productId,
      quantity,
      totalPrice: product.price * quantity,
      status: 'pending'
    })
    .returning()

  // 操作 3：创建订单项
  await tx.insert(orderItems).values({
    orderId: order.id,
    productId,
    quantity,
    unitPrice: product.price
  })

  return order

  // 如果任何一步抛异常，所有操作自动回滚
  // 如果全部成功，退出回调时自动提交
})
```

### 4.4 事务的真实业务场景

```ts
// 场景 1：转账 —— 经典的事务场景
async function transfer(fromUserId: string, toUserId: string, amount: number) {
  await db.transaction(async (tx) => {
    // 扣款
    const [from] = await tx
      .update(accounts)
      .set({ balance: sql`balance - ${amount}` })
      .where(and(eq(accounts.userId, fromUserId), gte(accounts.balance, amount)))
      .returning()

    if (!from) throw new Error('Insufficient balance')

    // 入账
    await tx
      .update(accounts)
      .set({ balance: sql`balance + ${amount}` })
      .where(eq(accounts.userId, toUserId))

    // 记录流水
    await tx.insert(transactions).values([
      { userId: fromUserId, type: 'debit', amount, relatedUserId: toUserId },
      { userId: toUserId, type: 'credit', amount, relatedUserId: fromUserId }
    ])
  })
}

// 场景 2：注册 —— 同时创建用户 + 默认配置 + 欢迎通知
async function registerUser(data: RegisterInput) {
  return db.transaction(async (tx) => {
    const [user] = await tx.insert(users).values({
      email: data.email,
      name: data.name,
      passwordHash: data.passwordHash
    }).returning()

    await tx.insert(userSettings).values({
      userId: user.id,
      theme: 'system',
      language: 'zh-CN',
      emailNotification: true
    })

    await tx.insert(notifications).values({
      userId: user.id,
      title: '欢迎加入',
      content: '您的账号已创建成功'
    })

    return user
  })
}

// 场景 3：批量操作 —— 导入多条数据，一条失败全部回滚
async function importUsers(userList: CreateUserInput[]) {
  return db.transaction(async (tx) => {
    const results = []
    for (const userData of userList) {
      const [user] = await tx.insert(users).values(userData).returning()
      results.push(user)
    }
    return results
  })
}
```

## 5. 并发控制 —— 多人同时操作的问题

### 5.1 为什么前端不太关心并发，后端必须关心

```
前端：
  用户 A 在自己的浏览器里操作，用户 B 在自己的浏览器里操作。
  各操作各的，互不影响。

后端：
  用户 A 和用户 B 的请求在同一时刻到达服务器，
  可能同时修改数据库里的同一行数据。
  → 如果不处理，数据就会出错。
```

### 5.2 经典并发问题 —— 图解

**问题 1：丢失更新（Lost Update）**

```
场景：商品库存 = 10，用户 A 和 B 同时下单各买 1 件

时间线：
  T1  用户 A 读取库存 → 10
  T2  用户 B 读取库存 → 10          （A 还没写回）
  T3  用户 A 写入库存 → 10 - 1 = 9  ✅
  T4  用户 B 写入库存 → 10 - 1 = 9  ❌ 覆盖了 A 的修改！

结果：卖了 2 件，库存只减了 1  →  超卖！
正确结果应该是 8
```

**问题 2：脏读（Dirty Read）**

```
时间线：
  T1  事务 A 开始转账：扣了发送方 100 元
  T2  事务 B 读取发送方余额 → 看到扣款后的值（但 A 还没提交）
  T3  事务 A 回滚（转账失败，钱退回来了）
  T4  事务 B 基于错误的余额做了决策

结果：B 读到了一个"从未真正存在过"的值
```

**问题 3：不可重复读（Non-Repeatable Read）**

```
时间线：
  T1  事务 A 读取用户余额 → 1000
  T2  事务 B 修改用户余额 → 500（提交了）
  T3  事务 A 再次读取用户余额 → 500    ← 和 T1 读的不一样了！

对于事务 A 来说，同一个事务内两次读同一数据结果不同，逻辑可能出错。
```

### 5.3 事务隔离级别 —— 解决并发问题的系统方案

PostgreSQL 提供四个隔离级别，逐级递增保护强度：

```
隔离级别           防脏读  防不可重复读  防幻读  性能
─────────────────  ──────  ──────────  ──────  ──────
READ UNCOMMITTED   ❌      ❌          ❌      最好（PG 自动升级为下一级）
READ COMMITTED     ✅      ❌          ❌      好（PostgreSQL 默认）
REPEATABLE READ    ✅      ✅          ❌      一般
SERIALIZABLE       ✅      ✅          ✅      最差
```

**PostgreSQL 默认是 READ COMMITTED**，在大多数场景下够用。

**什么时候需要更高隔离级别？**
- 金融转账 → REPEATABLE READ 或 SERIALIZABLE
- 库存扣减 → 用行级锁（下一节）比提高隔离级别更高效
- 统计报表 → REPEATABLE READ（确保统计期间数据一致）

```ts
// 设置事务隔离级别
await db.transaction(async (tx) => {
  // Drizzle 原生不支持设置隔离级别，用 raw SQL
  await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`)
  // ... 事务操作
})
```

### 5.4 乐观锁 vs 悲观锁

这是解决并发更新的两种策略，可以类比前端协作编辑场景：

```
乐观锁 = Google Docs 模式
  "先编辑，保存时检查有没有人改过，改过就冲突提示"
  适合：读多写少，冲突概率低

悲观锁 = 占用编辑锁模式
  "我打开文件时锁住它，别人只能看不能改，我改完再释放"
  适合：写多读少，冲突概率高
```

**乐观锁实现（版本号方式）：**

```ts
// 表里加一个 version 字段
export const products = pgTable('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 200 }).notNull(),
  stock: integer('stock').notNull().default(0),
  version: integer('version').notNull().default(0),  // 版本号
  // ...
})

// 更新时带上版本号条件
async function decreaseStock(productId: string, quantity: number, currentVersion: number) {
  const [updated] = await db
    .update(products)
    .set({
      stock: sql`stock - ${quantity}`,
      version: sql`version + 1`  // 版本号 +1
    })
    .where(
      and(
        eq(products.id, productId),
        eq(products.version, currentVersion),  // 版本号必须匹配
        gte(products.stock, quantity)
      )
    )
    .returning()

  if (!updated) {
    // version 不匹配 → 说明有人在你之前修改了
    throw new Error('Conflict: product has been modified by another transaction')
  }

  return updated
}

// 使用时：读取 → 修改 → 重试
async function purchaseWithRetry(productId: string, quantity: number, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const product = await db.query.products.findFirst({ where: eq(products.id, productId) })
      if (!product) throw new Error('Product not found')

      return await decreaseStock(productId, quantity, product.version)
    } catch (error) {
      if (attempt === maxRetries - 1) throw error
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
    }
  }
}
```

**悲观锁实现（SELECT FOR UPDATE）：**

```ts
// 在事务中锁住行
async function decreaseStockPessimistic(productId: string, quantity: number) {
  return db.transaction(async (tx) => {
    // FOR UPDATE：锁住这一行，其他事务要修改这行必须等待
    const [product] = await tx.execute(
      sql`SELECT * FROM products WHERE id = ${productId} FOR UPDATE`
    )

    if (!product || product.stock < quantity) {
      throw new Error('Insufficient stock')
    }

    const [updated] = await tx
      .update(products)
      .set({ stock: sql`stock - ${quantity}` })
      .where(eq(products.id, productId))
      .returning()

    return updated
    // 事务结束时自动释放锁
  })
}
```

**如何选择？**

| 场景             | 推荐方案   | 原因                                 |
| ---------------- | ---------- | ------------------------------------ |
| 用户修改个人资料 | 乐观锁     | 冲突概率极低                         |
| 秒杀/抢购       | 悲观锁     | 高并发写同一行，乐观锁重试太多       |
| 文章编辑         | 乐观锁     | 冲突时提示用户"内容已被修改"        |
| 账户余额扣减     | 悲观锁     | 金融操作不允许重试导致的不一致       |
| 库存一般扣减     | 乐观锁     | SQL `stock - N WHERE stock >= N` 自身是原子的 |

### 5.5 死锁 —— 悲观锁的陷阱

```
死锁 = 两个事务互相等待对方释放锁，谁都无法继续

时间线：
  T1  事务 A 锁住了用户 1 的行
  T2  事务 B 锁住了用户 2 的行
  T3  事务 A 想锁用户 2 → 等待事务 B 释放
  T4  事务 B 想锁用户 1 → 等待事务 A 释放
  → 永远等下去…
```

**PostgreSQL 会自动检测死锁并回滚其中一个事务**（通常回滚等待时间短的），应用收到错误后重试即可。

**预防死锁的原则：** 多个事务如果要锁多行，**按相同顺序加锁**。

```ts
// ❌ 容易死锁：A 先锁 user1 再锁 user2，B 先锁 user2 再锁 user1
// ✅ 安全：所有事务都按 id 升序锁

async function transferSafe(fromId: string, toId: string, amount: number) {
  const [firstId, secondId] = [fromId, toId].sort()

  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT * FROM accounts WHERE user_id = ${firstId} FOR UPDATE`)
    await tx.execute(sql`SELECT * FROM accounts WHERE user_id = ${secondId} FOR UPDATE`)
    // 现在两行都锁住了，安全执行转账
    // ...
  })
}
```

## 6. N+1 问题 —— 前端同学最容易踩的性能坑

### 6.1 什么是 N+1 问题

```ts
// ❌ N+1 查询：1 次查用户列表 + N 次查每个用户的文章
const users = await db.select().from(usersTable)  // 1 次查询

for (const user of users) {
  // 循环里查数据库 = 灾难！
  const posts = await db.select().from(postsTable).where(eq(postsTable.authorId, user.id))
  user.posts = posts  // 如果有 100 个用户 → 共 101 次查询
}
```

```ts
// ✅ 正确方式 1：JOIN（一次查询）
const result = await db
  .select()
  .from(usersTable)
  .leftJoin(postsTable, eq(postsTable.authorId, usersTable.id))

// ✅ 正确方式 2：Relational Query（Drizzle 自动优化）
const usersWithPosts = await db.query.users.findMany({
  with: { posts: true }
})

// ✅ 正确方式 3：手动两次查询（IN 查询）
const users = await db.select().from(usersTable)
const userIds = users.map((u) => u.id)
const posts = await db.select().from(postsTable).where(inArray(postsTable.authorId, userIds))
// 然后在应用层拼装
```

**记住这个原则：** 永远不要在循环里查数据库。

## 7. 数据迁移（Migration）与种子数据

### 7.1 迁移的概念

迁移 = 数据库结构的"版本控制"。就像 Git 管理代码版本一样，Migration 管理数据库表结构的变更。

```
v1: 创建 users 表
v2: 给 users 表加 avatar 字段
v3: 创建 posts 表
v4: 给 posts 表加 status 字段
```

每个迁移文件记录一个变更，可以按顺序重放，确保所有环境的数据库结构一致。

### 7.2 Drizzle Kit 操作

```bash
# 生成迁移文件（对比 schema 和数据库的差异）
pnpm drizzle-kit generate

# 执行迁移（把变更应用到数据库）
pnpm drizzle-kit migrate

# 可视化数据库（本地 Web UI）
pnpm drizzle-kit studio
```

### 7.3 种子数据

```ts
// src/db/seed.ts
import { db } from './index'
import { users, posts } from './schema'
import bcrypt from 'bcrypt'

async function seed() {
  console.log('Seeding database...')

  const passwordHash = await bcrypt.hash('password123', 12)

  const [admin] = await db
    .insert(users)
    .values({ email: 'admin@example.com', name: 'Admin', passwordHash, role: 'admin' })
    .returning()

  const [alice] = await db
    .insert(users)
    .values({ email: 'alice@example.com', name: 'Alice', passwordHash, role: 'user' })
    .returning()

  await db.insert(posts).values([
    { title: 'Welcome', content: 'First post!', authorId: admin.id },
    { title: 'Getting Started', content: 'Tutorial content...', authorId: alice.id }
  ])

  console.log('Seeding complete!')
  process.exit(0)
}

seed()
```

```json
// package.json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx src/db/seed.ts",
    "db:studio": "drizzle-kit studio",
    "db:setup": "pnpm db:migrate && pnpm db:seed"
  }
}
```

## 8. 幂等设计与 Soft Delete

### 8.1 幂等性 —— 前端同学一定遇到过的场景

```
场景：用户点了"提交订单"按钮，网络慢，用户着急又点了一次。
后端收到两次一模一样的请求。

没有幂等设计：创建了两个订单 → 重复扣款
有幂等设计：第二次请求返回第一次的结果 → 安全
```

```ts
// 方案 1：Idempotency Key（幂等键）
router.post('/orders', authMiddleware, async (req, res, next) => {
  try {
    const idempotencyKey = req.headers['x-idempotency-key']?.toString()

    if (idempotencyKey) {
      const existing = await db.query.orders.findFirst({
        where: eq(orders.idempotencyKey, idempotencyKey)
      })
      if (existing) return res.json(existing) // 直接返回已有结果
    }

    const order = await orderService.create({ ...req.body, idempotencyKey })
    res.status(201).json(order)
  } catch (error) {
    next(error)
  }
})

// 前端配合：
// fetch('/api/orders', {
//   method: 'POST',
//   headers: { 'X-Idempotency-Key': crypto.randomUUID() },
//   body: JSON.stringify(orderData)
// })
```

```ts
// 方案 2：UPSERT（有则更新，无则插入）
await db
  .insert(userSettings)
  .values({ userId, theme: 'dark', language: 'zh-CN' })
  .onConflictDoUpdate({
    target: userSettings.userId,
    set: { theme: 'dark', language: 'zh-CN', updatedAt: new Date() }
  })
```

### 8.2 Soft Delete —— 为什么不直接 DELETE

```
物理删除：DELETE FROM users WHERE id = '...'
  ❌ 数据永久消失，无法恢复
  ❌ 关联数据可能产生悬挂引用
  ❌ 无法审计"谁什么时候删了什么"

软删除：UPDATE users SET deleted_at = NOW() WHERE id = '...'
  ✅ 数据还在，可以恢复
  ✅ 可以审计删除操作
  ✅ 关联数据不受影响
  ⚠️ 查询时必须加 WHERE deleted_at IS NULL
```

```ts
// 封装为通用方法
async function softDelete(table: any, id: string) {
  await db.update(table).set({ deletedAt: new Date() }).where(eq(table.id, id))
}

async function restore(table: any, id: string) {
  await db.update(table).set({ deletedAt: null }).where(eq(table.id, id))
}

// 查询时始终过滤
function findActive(table: any) {
  return db.select().from(table).where(isNull(table.deletedAt))
}
```

## 9. 课堂练习

### 练习 4：设计一个多租户 SaaS 数据模型

**目标：** 为一个简单的项目管理 SaaS 设计并实现数据库层，涵盖建模、事务、并发控制。

**要求：**

1. 使用 Drizzle ORM + PostgreSQL（Docker 运行）
2. 实现多租户隔离（通过 tenant_id 字段）
3. 表设计：tenants / users / projects / tasks
4. 所有表包含审计字段（created_at / updated_at / deleted_at）
5. 编写 migration 和 seed 脚本
6. 实现基本的 CRUD Service 层
7. 用事务实现"创建项目并自动创建默认任务"
8. 用乐观锁处理"多人同时修改同一任务"

**数据模型：**

```
tenants: id, name, slug, plan, version
users: id, tenant_id, email, name, role
projects: id, tenant_id, name, description, status
tasks: id, project_id, title, status, assignee_id, due_date, version
```

**必须实现的场景：**

```ts
// 场景 1：创建项目（事务）
// → 创建 project + 3 个默认任务（"计划"、"执行"、"复盘"）
// → 任何一步失败全部回滚

// 场景 2：更新任务状态（乐观锁）
// → 两个人同时修改同一任务的状态
// → 第二个人收到冲突提示

// 场景 3：查询项目及其所有任务（避免 N+1）
// → 一次查询返回项目和关联任务
```

**验证标准：**

- [ ] `pnpm db:setup` 一键初始化数据库（migrate + seed）
- [ ] 种子数据正确插入（至少 2 个租户、每个租户 2 个用户）
- [ ] 多租户查询正确隔离（租户 A 看不到租户 B 的数据）
- [ ] 创建项目事务正确（要么全成功，要么全回滚）
- [ ] 乐观锁冲突时返回明确错误信息
- [ ] 列表查询无 N+1 问题（用 Drizzle relational query 或 JOIN）
- [ ] 软删除生效（删除后查不到，但数据仍在）

**参考代码：** 见 [demos/04-database](../demos/04-database)
