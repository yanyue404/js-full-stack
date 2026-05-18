# 第三讲：Node.js 后端开发

> 从前端出发，掌握后端 API 开发的核心能力。

## 写在前面：前端与后端的思维差异

作为前端工程师转向后端，首先需要理解一个核心差异：

| 维度     | 前端思维                    | 后端思维                           |
| -------- | --------------------------- | ---------------------------------- |
| 用户     | 面对 1 个用户的浏览器       | 同时服务 N 个用户的请求            |
| 状态     | 状态在内存里（Zustand）     | 状态在数据库里，进程可随时重启     |
| 信任边界 | 浏览器是"自己人"            | 任何请求都可能被伪造               |
| 错误影响 | 页面白屏，刷新可恢复        | 数据损坏，可能无法恢复             |
| 并发     | 单用户操作，极少考虑        | 多用户同时操作同一数据，必须考虑   |

**一句话总结：** 前端关心"让用户看到正确的东西"，后端关心"在任何情况下都不让数据出错"。

## 1. Node.js 运行时与事件循环

### 1.1 Node.js 是什么

Node.js 是基于 Chrome V8 引擎的 JavaScript 运行时。对前端工程师来说，这意味着你可以用同一门语言覆盖前后端，不需要学 Java / Go / Python。

但 Node.js 不只是"跑在服务端的 JS"，它有自己的特性：

```
浏览器 JS                          Node.js
├── DOM / BOM                      ├── fs（文件系统）
├── fetch / XMLHttpRequest         ├── http（创建服务器）
├── localStorage                   ├── crypto（加密）
├── window 对象                    ├── process（进程信息）
└── 受沙箱限制                     └── 可以访问操作系统所有资源
```

### 1.2 事件循环 —— 理解 Node 的并发模型

前端工程师熟悉"JS 是单线程的"，但可能困惑：单线程怎么同时服务上千请求？

答案是**事件循环（Event Loop）+ 非阻塞 I/O**：

```
        ┌─────────────────────────┐
        │       接收请求           │
        └──────────┬──────────────┘
                   ▼
        ┌─────────────────────────┐
        │  执行同步代码（很快）     │  ← 单线程执行
        └──────────┬──────────────┘
                   ▼
        ┌─────────────────────────┐
        │  遇到 I/O（数据库/文件）  │
        │  → 交给系统线程池处理     │  ← 不阻塞主线程
        │  → 主线程继续处理下一请求  │
        └──────────┬──────────────┘
                   ▼
        ┌─────────────────────────┐
        │  I/O 完成 → 回调进入队列  │
        │  → 事件循环取出执行       │
        └─────────────────────────┘
```

**类比前端：** 就像 `fetch` 不会阻塞页面渲染一样，Node 里的数据库查询、文件读写也不会阻塞其他请求的处理。

**关键原则：** 永远不要在请求处理中执行 CPU 密集型的同步操作（如大量循环、同步加密），否则会阻塞所有其他请求。

### 1.3 ES Modules vs CommonJS

```ts
// ES Modules（推荐，现代项目统一使用）
import express from 'express'
import { readFile } from 'fs/promises'
export function helper() {}

// CommonJS（Node 传统方式，了解即可）
const express = require('express')
module.exports = { helper }
```

在 `package.json` 中设置 `"type": "module"` 即可默认使用 ESM。

### 1.4 内置模块速览

| 模块          | 用途                 | 示例                                   |
| ------------- | -------------------- | -------------------------------------- |
| `fs/promises` | 文件系统（异步）     | `readFile('data.json', 'utf-8')`       |
| `path`        | 路径处理             | `path.join(__dirname, 'uploads')`      |
| `crypto`      | 加密与哈希           | `crypto.randomUUID()`                  |
| `url`         | URL 解析             | `new URL(req.url, 'http://localhost')` |
| `http`        | 原生 HTTP 服务器     | 框架底层使用，一般不直接调用           |

## 2. 一个请求的完整生命周期

在写代码之前，先理解一个 HTTP 请求从到达服务器到返回响应的完整过程。这是后端开发的"大地图"。

```
客户端 (React App)
    │
    │  POST /api/orders  { productId: "123", quantity: 2 }
    │  Headers: { Authorization: "Bearer eyJhbG..." }
    ▼
┌────────────────────────────────────────────────────────┐
│ Node.js 服务器                                         │
│                                                        │
│  1. 中间件层（按顺序执行）                               │
│     ├── cors()         → 检查跨域是否允许               │
│     ├── express.json() → 解析请求体为 JS 对象           │
│     ├── requestId()    → 给请求分配唯一 ID              │
│     ├── logger()       → 记录请求日志                   │
│     └── authMiddleware → 验证 JWT Token，提取用户信息    │
│                                                        │
│  2. 路由匹配                                            │
│     POST /api/orders → ordersRouter.post('/')          │
│                                                        │
│  3. 请求校验                                            │
│     Zod schema 校验 body → 失败返回 400                 │
│                                                        │
│  4. 业务逻辑（Service 层）                               │
│     ├── 查数据库：商品是否存在、库存够不够               │
│     ├── 开事务：扣库存 + 创建订单（原子操作）            │
│     └── 调外部服务：通知支付系统                        │
│                                                        │
│  5. 返回响应                                            │
│     201 Created { orderId: "456", total: 199.8 }       │
│                                                        │
│  6. 后置处理                                            │
│     └── 错误兜底 errorHandler → 500 Internal Error     │
└────────────────────────────────────────────────────────┘
```

**对前端同学的建议：** 每次写一个接口前，先在脑子里走一遍这个流程图。

## 3. Express 框架搭建 REST API

### 3.1 Express 快速上手

```ts
import express from 'express'

const app = express()
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(8080, () => {
  console.log('Server running on http://localhost:8080')
})
```

### 3.2 项目结构 —— 分层架构

前端同学可能习惯把逻辑都写在组件里，但后端**必须**分层：

```
src/
├── routes/            # 路由层：定义 URL → 调用 controller
│   ├── auth.ts
│   ├── users.ts
│   └── orders.ts
├── controllers/       # 控制器：解析请求参数、调用 service、返回响应
│   ├── authController.ts
│   └── userController.ts
├── services/          # 业务逻辑层：核心业务规则，不关心 HTTP
│   ├── authService.ts
│   └── userService.ts
├── middleware/         # 中间件：鉴权、日志、错误处理等横切关注点
│   ├── auth.ts
│   ├── validate.ts
│   └── errorHandler.ts
├── db/                # 数据访问层：SQL 查询、ORM 操作
│   ├── schema.ts
│   └── index.ts
├── types/             # 类型定义
│   └── index.ts
├── utils/             # 工具函数
│   └── password.ts
└── index.ts           # 入口
```

**为什么要分层？**

```
类比前端：
  组件 → 只负责渲染和用户交互
  Zustand Store → 只负责状态管理
  API 函数 → 只负责网络请求

后端一样：
  Route → 只负责 URL 映射（像前端的 Router）
  Controller → 只负责"接参数、返结果"（像前端的事件处理函数）
  Service → 只负责业务逻辑（像前端的 Store action）
  DB → 只负责数据读写（像前端的 API 函数）
```

### 3.3 RESTful API 设计规范

REST 不是一种技术，是一种 API 风格约定：

| 操作     | HTTP 方法 | 路径                 | 状态码    | 语义                     |
| -------- | --------- | -------------------- | --------- | ------------------------ |
| 列表     | GET       | `/api/users`         | 200       | 获取资源集合             |
| 详情     | GET       | `/api/users/:id`     | 200 / 404 | 获取单个资源             |
| 创建     | POST      | `/api/users`         | 201       | 创建新资源               |
| 全量更新 | PUT       | `/api/users/:id`     | 200 / 404 | 替换整个资源             |
| 部分更新 | PATCH     | `/api/users/:id`     | 200 / 404 | 更新部分字段             |
| 删除     | DELETE    | `/api/users/:id`     | 204 / 404 | 删除资源                 |

**常见设计错误（前端同学容易犯的）：**

```
❌ POST /api/getUsers          → GET 才对
❌ GET  /api/deleteUser?id=1   → DELETE 才对
❌ POST /api/user/update       → PUT/PATCH + /:id 才对

✅ GET    /api/users
✅ DELETE /api/users/123
✅ PATCH  /api/users/123
```

### 3.4 路由与控制器实现

```ts
// routes/users.ts
import { Router } from 'express'
import { userController } from '../controllers/userController'
import { authMiddleware } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { updateUserSchema } from '../types'

const router = Router()

router.get('/', authMiddleware, userController.list)
router.get('/:id', authMiddleware, userController.getById)
router.patch('/:id', authMiddleware, validate(updateUserSchema), userController.update)
router.delete('/:id', authMiddleware, userController.remove)

export default router
```

```ts
// controllers/userController.ts
import { userService } from '../services/userService'

export const userController = {
  async list(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query
      const result = await userService.findAll({ page: Number(page), limit: Number(limit) })
      res.json(result)
    } catch (error) {
      next(error)
    }
  },

  async getById(req, res, next) {
    try {
      const user = await userService.findById(req.params.id)
      if (!user) return res.status(404).json({ error: 'User not found' })
      res.json(user)
    } catch (error) {
      next(error)
    }
  },

  async update(req, res, next) {
    try {
      const updated = await userService.update(req.params.id, req.body)
      if (!updated) return res.status(404).json({ error: 'User not found' })
      res.json(updated)
    } catch (error) {
      next(error)
    }
  },

  async remove(req, res, next) {
    try {
      await userService.softDelete(req.params.id)
      res.status(204).end()
    } catch (error) {
      next(error)
    }
  }
}
```

### 3.5 分页与列表查询

前端同学在对接列表接口时一定见过分页，现在自己来实现：

```ts
// services/userService.ts
async function findAll({ page, limit }: { page: number; limit: number }) {
  const offset = (page - 1) * limit

  const [items, [{ count }]] = await Promise.all([
    db.select().from(users).where(isNull(users.deletedAt)).offset(offset).limit(limit).orderBy(desc(users.createdAt)),
    db.select({ count: sql<number>`count(*)` }).from(users).where(isNull(users.deletedAt))
  ])

  return {
    items,
    pagination: {
      page,
      limit,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / limit)
    }
  }
}
```

## 4. 中间件机制

### 4.1 什么是中间件

中间件是后端最核心的设计模式之一。可以类比前端的 **Axios 拦截器**：

```
前端 Axios 拦截器：
  请求拦截 → 自动加 Token → 发送请求 → 响应拦截 → 统一错误处理

后端中间件：
  请求到达 → 中间件1(日志) → 中间件2(鉴权) → 路由处理 → 中间件3(错误处理) → 响应
```

执行顺序是一条管道（Pipeline），每个中间件决定是**放行**（`next()`）还是**拦截**（直接返回响应）：

```ts
function myMiddleware(req, res, next) {
  // 1. 做一些处理
  console.log('请求到达')

  // 2. 决定是否放行
  if (somethingWrong) {
    return res.status(403).json({ error: 'Forbidden' })  // 拦截
  }

  next()  // 放行，交给下一个中间件或路由处理
}
```

### 4.2 常用中间件配置

```ts
import express from 'express'
import cors from 'cors'

const app = express()

// 1. CORS —— 跨域控制（前端同学最熟悉的问题）
app.use(cors({
  origin: ['http://localhost:3000', 'https://myapp.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']
}))

// 2. Body 解析 —— 把请求体从原始字节流解析为 JS 对象
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// 3. 请求 ID —— 每个请求分配唯一标识，方便日志追踪
app.use((req, res, next) => {
  req.id = req.headers['x-request-id']?.toString() || crypto.randomUUID()
  res.setHeader('x-request-id', req.id)
  next()
})

// 4. 请求日志
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    console.log(`[${req.id}] ${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
})

// 5. 路由
app.use('/api/auth', authRouter)
app.use('/api/users', usersRouter)
app.use('/api/orders', ordersRouter)

// 6. 404 处理
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' })
})

// 7. 错误处理（必须 4 个参数，Express 才识别为错误中间件）
app.use((err, req, res, next) => {
  console.error(`[${req.id}] Error:`, err)
  const statusCode = err.statusCode || 500
  res.status(statusCode).json({
    error: { message: statusCode === 500 ? 'Internal Server Error' : err.message }
  })
})
```

## 5. 鉴权方案详解

这是前端同学转后端**最需要深入理解**的部分。前端只需要"存 Token、请求时带上"，后端要理解整个鉴权体系是如何运作的。

### 5.1 为什么需要鉴权

HTTP 协议是**无状态的** —— 服务器不会记住"上一个请求是谁发的"。每次请求都是独立的。

类比：你打电话给客服，每次打都要重新报身份证号验证身份。鉴权方案就是让你不用每次都报身份证号的机制。

### 5.2 密码安全 —— 从注册开始

**绝对禁止明文存储密码。** 数据库泄漏是真实会发生的事。

```ts
import bcrypt from 'bcrypt'

// bcrypt 工作原理（前端同学需要知道的）：
// 1. 它不是"加密"，是"哈希"——单向操作，不可逆
// 2. 相同密码每次 hash 结果不同（因为自动加随机盐值 salt）
// 3. 验证时不是"解密比较"，而是"用相同算法重新计算比较"

// 注册时：密码 → hash 后存数据库
const passwordHash = await bcrypt.hash('user-password-123', 12)
// 结果类似：$2b$12$LJ3m4ys3Gz8C6RqMqBqXXe9Y9ZQkZ8Y... （每次不同）

// 登录时：用户输入的密码 vs 数据库里的 hash
const isValid = await bcrypt.compare('user-password-123', storedHash) // true or false
```

**参数 12 是什么？** 是"成本因子"（cost factor），值越大计算越慢：
- 10 = ~10ms（开发环境可用）
- 12 = ~100ms（生产推荐）
- 14 = ~500ms（高安全需求）

越慢 = 暴力破解越困难，但也别太大，否则登录接口响应很慢。

### 5.3 JWT 深入理解

#### JWT 是什么

JWT（JSON Web Token）是一个自包含的令牌，由三部分组成：

```
eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiIxMjMiLCJyb2xlIjoiYWRtaW4ifQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
 ──────────────────── ──────────────────────────────────────── ──────────────────────────────────────────
       Header                       Payload                              Signature
    (算法信息)                    (用户数据)                        (防篡改签名)
```

```ts
// Header（Base64 解码后）
{ "alg": "HS256", "typ": "JWT" }

// Payload（Base64 解码后）—— 这部分是明文！谁都能解码！
{ "userId": "123", "role": "admin", "exp": 1700000000 }

// Signature = HMAC-SHA256(Header + "." + Payload, 服务端密钥)
// 只有服务端能生成和验证签名，保证 Payload 没被篡改
```

**关键认知：**
- Payload 不是加密的，只是 Base64 编码，**任何人都能读取内容**
- 所以绝对不能在 Payload 里放密码、银行卡等敏感信息
- 签名只保证"没被篡改"，不保证"没被看到"

#### 前端视角的 JWT 流程

```
┌──────────┐                          ┌──────────┐
│  React   │                          │ Express  │
│  前端    │                          │ 后端     │
└────┬─────┘                          └────┬─────┘
     │                                     │
     │  1. POST /api/auth/login            │
     │     { email, password }             │
     │ ──────────────────────────────────► │
     │                                     │  校验密码 → 生成 JWT
     │  2. 返回 { token, user }            │
     │ ◄────────────────────────────────── │
     │                                     │
     │  前端存储 Token                      │
     │  (localStorage / cookie)            │
     │                                     │
     │  3. GET /api/users                  │
     │     Authorization: Bearer eyJ...    │
     │ ──────────────────────────────────► │
     │                                     │  验证签名 → 提取 userId
     │  4. 返回用户列表                     │
     │ ◄────────────────────────────────── │
```

#### 完整实现

```ts
// utils/jwt.ts
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET!
const ACCESS_TOKEN_EXPIRES = '15m'   // Access Token 短期
const REFRESH_TOKEN_EXPIRES = '7d'   // Refresh Token 长期

interface TokenPayload {
  userId: string
  role: string
}

export function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES })
}

export function generateRefreshToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES })
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, JWT_SECRET) as TokenPayload
}
```

```ts
// middleware/auth.ts
import { verifyToken } from '../utils/jwt'

export function authMiddleware(req, res, next) {
  // 1. 从 Header 中提取 Token
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.slice(7)

  // 2. 验证 Token
  try {
    const payload = verifyToken(token)
    req.user = payload  // 后续路由可以通过 req.user 获取当前用户
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}
```

### 5.4 Token 刷新机制

为什么需要两个 Token？用一个生活中的例子来理解：

```
Access Token  = 你的员工卡     → 短期有效（15分钟），丢了风险小
Refresh Token = 你的身份证     → 长期有效（7天），用来补办员工卡

流程：
  1. 登录 → 发放 Access Token + Refresh Token
  2. 正常请求 → 带 Access Token
  3. Access Token 过期 → 用 Refresh Token 换新的 Access Token
  4. Refresh Token 也过期 → 重新登录
```

```ts
// routes/auth.ts — 完整的登录 + 注册 + 刷新

// 注册
router.post('/register', validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, name } = req.body

    // 检查邮箱是否已注册
    const existing = await userService.findByEmail(email)
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' })
    }

    // 创建用户（密码在 service 层 hash）
    const user = await userService.create({ email, password, name })

    // 生成双 Token
    const accessToken = generateAccessToken({ userId: user.id, role: user.role })
    const refreshToken = generateRefreshToken({ userId: user.id, role: user.role })

    // 将 Refresh Token 存入数据库（用于失效管理）
    await tokenService.saveRefreshToken(user.id, refreshToken)

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken
    })
  } catch (error) {
    next(error)
  }
})

// 登录
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body

    const user = await userService.findByEmail(email)
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const isValid = await bcrypt.compare(password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const accessToken = generateAccessToken({ userId: user.id, role: user.role })
    const refreshToken = generateRefreshToken({ userId: user.id, role: user.role })

    await tokenService.saveRefreshToken(user.id, refreshToken)

    res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken
    })
  } catch (error) {
    next(error)
  }
})

// 刷新 Token
router.post('/refresh', async (req, res, next) => {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token required' })
    }

    // 1. 验证 Refresh Token 签名
    let payload: TokenPayload
    try {
      payload = verifyToken(refreshToken)
    } catch {
      return res.status(401).json({ error: 'Invalid refresh token' })
    }

    // 2. 检查这个 Refresh Token 是否在数据库中（防止已注销的 Token 继续使用）
    const exists = await tokenService.isRefreshTokenValid(payload.userId, refreshToken)
    if (!exists) {
      return res.status(401).json({ error: 'Refresh token revoked' })
    }

    // 3. 发新的 Access Token
    const newAccessToken = generateAccessToken({ userId: payload.userId, role: payload.role })

    res.json({ accessToken: newAccessToken })
  } catch (error) {
    next(error)
  }
})

// 登出 —— 让 Refresh Token 失效
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await tokenService.revokeRefreshToken(req.user.userId)
    res.status(204).end()
  } catch (error) {
    next(error)
  }
})
```

### 5.5 前端配合：Axios 自动刷新 Token

后端写好 Token 刷新接口，前端需要配合自动刷新：

```ts
// 前端 api/client.ts —— 给前端同学看看完整闭环
import axios from 'axios'

const client = axios.create({ baseURL: '/api' })

let isRefreshing = false
let failedQueue: Array<{ resolve: Function; reject: Function }> = []

function processQueue(error: any, token: string | null) {
  failedQueue.forEach(({ resolve, reject }) => {
    error ? reject(error) : resolve(token)
  })
  failedQueue = []
}

// 请求拦截：自动带上 Access Token
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// 响应拦截：Access Token 过期时自动用 Refresh Token 换新的
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`
          return client(originalRequest)
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = localStorage.getItem('refreshToken')
        const { data } = await axios.post('/api/auth/refresh', { refreshToken })
        localStorage.setItem('accessToken', data.accessToken)
        processQueue(null, data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`
        return client(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError, null)
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.location.href = '/login'
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)
```

### 5.6 权限控制（RBAC）

RBAC = Role-Based Access Control（基于角色的访问控制）。大多数业务系统的权限模型。

```
角色        权限
admin   →   可以管理所有用户、查看所有数据
editor  →   可以编辑内容，不能管理用户
user    →   只能管理自己的数据
```

```ts
// middleware/authorize.ts

// 方式一：按角色控制
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }
    next()
  }
}

// 方式二：按资源所有权控制（"只能操作自己的数据"）
function requireOwnerOrAdmin(getResourceOwnerId: (req) => Promise<string | null>) {
  return async (req, res, next) => {
    if (req.user.role === 'admin') return next()

    const ownerId = await getResourceOwnerId(req)
    if (ownerId !== req.user.userId) {
      return res.status(403).json({ error: 'You can only modify your own resources' })
    }
    next()
  }
}

// 使用示例
// 只有 admin 能删除用户
router.delete('/:id', authMiddleware, requireRole('admin'), userController.remove)

// 只有本人或 admin 能更新用户信息
router.patch(
  '/:id',
  authMiddleware,
  requireOwnerOrAdmin(async (req) => req.params.id),
  userController.update
)

// 只有 admin 和 editor 能创建文章
router.post('/posts', authMiddleware, requireRole('admin', 'editor'), postController.create)
```

### 5.7 Session 方案（对比理解）

JWT 是"无状态"的，而 Session 是"有状态"的，两者适用场景不同：

```
JWT（无状态）                           Session（有状态）
┌──────────┐     Token      ┌────────┐   ┌──────────┐   SessionID   ┌────────┐
│ 客户端   │ ────────────►  │ 服务器 │   │ 客户端   │ ───────────►  │ 服务器 │
│ 存 Token │                │ 验签名 │   │ 存 Cookie│               │ 查 Store│
└──────────┘                └────────┘   └──────────┘               └────┬───┘
                                                                         │
                            不查数据库                          ┌────────▼────────┐
                            ✅ 速度快                          │  Redis / 内存   │
                            ❌ 无法主动失效                     │  Session Store  │
                                                               └─────────────────┘
                                                                ✅ 可以主动踢人
                                                                ❌ 需要额外存储
```

```ts
// Session 方案示例（了解即可）
import session from 'express-session'
import RedisStore from 'connect-redis'
import Redis from 'ioredis'

app.use(session({
  store: new RedisStore({ client: new Redis() }),
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,     // JS 无法读取（防 XSS）
    secure: true,       // 仅 HTTPS
    sameSite: 'strict', // 防 CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 天
  }
}))

// 登录后设置 session
router.post('/login', async (req, res) => {
  // ... 校验密码
  req.session.userId = user.id
  req.session.role = user.role
  res.json({ user })
})

// 鉴权中间件
function sessionAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not logged in' })
  next()
}

// 登出 —— 直接销毁 session
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.status(204).end())
})
```

**什么时候选 JWT，什么时候选 Session？**

| 场景               | 推荐方案   | 原因                                 |
| ------------------ | ---------- | ------------------------------------ |
| SPA + REST API     | JWT        | 前后端分离，不依赖 Cookie            |
| 移动端 App         | JWT        | 原生 App 对 Cookie 支持不友好        |
| 传统 SSR 网站      | Session    | 服务端渲染天然依赖 Cookie            |
| 需要"踢人下线"     | Session    | 服务端可以随时删除 Session           |
| 多服务/微服务      | JWT        | 无状态，不需要共享 Session Store     |

### 5.8 安全防护清单

后端最重要的不是"能用"，而是"安全"。以下是必须关注的安全点：

```ts
// ✅ 1. 密码哈希 —— 用 bcrypt，至少 12 rounds
const hash = await bcrypt.hash(password, 12)

// ✅ 2. 防 SQL 注入 —— 使用参数化查询（ORM 默认安全）
// ❌ 危险：db.execute(`SELECT * FROM users WHERE email = '${email}'`)
// ✅ 安全：db.select().from(users).where(eq(users.email, email))

// ✅ 3. 限流 —— 防暴力破解
import rateLimit from 'express-rate-limit'
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20 }))

// ✅ 4. Helmet —— 设置安全相关的 HTTP 头
import helmet from 'helmet'
app.use(helmet())

// ✅ 5. 输入校验 —— 不信任任何来自客户端的数据
// 前端校验是"体验"，后端校验是"安全"，缺一不可

// ✅ 6. 不在响应中泄漏敏感信息
// ❌ res.json(user)                           → 会返回 passwordHash
// ✅ res.json({ id, email, name, role })      → 只返回安全字段

// ✅ 7. 环境变量存储密钥
// ❌ const secret = 'my-jwt-secret-123'
// ✅ const secret = process.env.JWT_SECRET!
```

## 6. 数据校验与错误处理

### 6.1 数据校验（Zod）

前端校验是为了**用户体验**（即时反馈），后端校验是为了**安全**（永远不信任客户端）。

```ts
import { z } from 'zod'

// 定义校验规则
const registerSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(8, '密码至少 8 个字符')
    .regex(/[A-Z]/, '需要包含至少一个大写字母')
    .regex(/[0-9]/, '需要包含至少一个数字'),
  name: z.string().min(1, '姓名不能为空').max(50, '姓名最多 50 个字符')
})

const updateUserSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  email: z.string().email().optional(),
  avatar: z.string().url().optional()
})

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  sortBy: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc')
})

// 从 Zod schema 自动推断 TypeScript 类型
type RegisterInput = z.infer<typeof registerSchema>
type UpdateUserInput = z.infer<typeof updateUserSchema>
type ListQuery = z.infer<typeof listQuerySchema>
```

```ts
// middleware/validate.ts —— 通用校验中间件
function validate(schema: z.ZodSchema, source: 'body' | 'query' | 'params' = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source])

    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      })
    }

    req[source] = result.data
    next()
  }
}

// 使用
router.post('/register', validate(registerSchema), authController.register)
router.get('/users', validate(listQuerySchema, 'query'), userController.list)
```

### 6.2 统一错误处理

```ts
// utils/AppError.ts —— 自定义错误类
class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message)
    this.name = 'AppError'
  }

  static badRequest(message: string) {
    return new AppError(400, message, 'BAD_REQUEST')
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(401, message, 'UNAUTHORIZED')
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(403, message, 'FORBIDDEN')
  }
  static notFound(message = 'Resource not found') {
    return new AppError(404, message, 'NOT_FOUND')
  }
  static conflict(message: string) {
    return new AppError(409, message, 'CONFLICT')
  }
}

// 在 service 层使用
async function findById(id: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, id) })
  if (!user) throw AppError.notFound(`User ${id} not found`)
  return user
}

// 错误中间件统一捕获
function errorHandler(err, req, res, next) {
  // Zod 校验错误
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.flatten().fieldErrors })
  }

  // 业务错误
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: { message: err.message, code: err.code } })
  }

  // 未知错误 —— 不要把内部错误暴露给客户端
  console.error(`[${req.id}] Unexpected error:`, err)
  res.status(500).json({ error: { message: 'Internal server error', code: 'INTERNAL_ERROR' } })
}
```

### 6.3 文件上传

```ts
import multer from 'multer'

const upload = multer({
  storage: multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname)
      cb(null, `${crypto.randomUUID()}${ext}`)
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    cb(null, allowed.includes(file.mimetype))
  }
})

router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  res.json({ url: `/uploads/${req.file.filename}` })
})
```

## 7. 课堂练习

### 练习 3：实现用户管理 REST API（含完整鉴权）

**目标：** 用 Express + TypeScript 实现一套完整的用户管理 API，包含双 Token 鉴权和 RBAC 权限控制。

**要求：**

1. 分层架构：routes / controllers / services / middleware
2. JWT 双 Token 机制：Access Token（15m）+ Refresh Token（7d）
3. RBAC 权限：admin 可管理所有用户，普通用户只能操作自己的数据
4. Zod 校验所有输入
5. bcrypt 密码哈希
6. 统一错误处理
7. 安全防护：helmet + cors + rateLimit

**API 设计：**

```
POST   /api/auth/register     注册（返回双 Token）
POST   /api/auth/login        登录（返回双 Token）
POST   /api/auth/refresh      刷新 Access Token
POST   /api/auth/logout       注销（使 Refresh Token 失效）
GET    /api/users              用户列表（需鉴权，支持分页和搜索）
GET    /api/users/:id          用户详情（需鉴权）
PATCH  /api/users/:id          更新用户（本人或 admin）
DELETE /api/users/:id          删除用户（仅 admin）
```

**验证标准：**

- [ ] 注册返回 accessToken + refreshToken
- [ ] Access Token 过期后，用 Refresh Token 可换新
- [ ] 登出后 Refresh Token 不可再使用
- [ ] 普通用户无法删除其他用户（返回 403）
- [ ] admin 可以删除任意用户
- [ ] 无效输入返回 400 和详细错误信息
- [ ] 未鉴权请求返回 401
- [ ] 密码不在任何接口响应中出现
- [ ] TypeScript 零报错

**参考代码：** 见 [demos/03-user-api](../demos/03-user-api)
