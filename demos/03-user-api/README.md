# 练习 3：用户管理 REST API

使用 Express + TypeScript 实现一套完整的用户管理 API，包含鉴权和数据校验。

## 目标

掌握 Node.js 后端开发的核心能力：RESTful API 设计、JWT 鉴权、数据校验、错误处理。

## 要求

1. 项目结构清晰：routes / services / middleware 分层
2. 实现完整 CRUD：GET / POST / PUT / DELETE
3. JWT 鉴权：注册、登录、受保护路由
4. Zod 数据校验：所有输入参数校验
5. 统一错误处理中间件
6. CORS 配置，支持前端跨域调用

## 快速开始

```bash
mkdir user-api && cd user-api
pnpm init
pnpm add express cors jsonwebtoken bcrypt zod
pnpm add -D typescript @types/express @types/cors @types/jsonwebtoken @types/bcrypt tsx
npx tsc --init
```

## API 设计

| 方法   | 路径                  | 说明           | 鉴权   |
| ------ | --------------------- | -------------- | ------ |
| POST   | /api/auth/register    | 用户注册       | 无     |
| POST   | /api/auth/login       | 用户登录       | 无     |
| GET    | /api/users            | 用户列表       | 需要   |
| GET    | /api/users/:id        | 用户详情       | 需要   |
| PUT    | /api/users/:id        | 更新用户       | 本人/admin |
| DELETE | /api/users/:id        | 删除用户       | admin  |

## 验证标准

- [ ] 所有接口可用 Postman / Thunder Client 正常调用
- [ ] 注册后返回 JWT Token
- [ ] 未携带 Token 访问受保护接口返回 401
- [ ] 无效输入返回 400 及详细错误信息
- [ ] 密码使用 bcrypt 加密存储
- [ ] TypeScript 零报错

## 参考实现

本目录提供了一份完整可运行的参考实现，**使用内存存储**（无需 PostgreSQL，便于第三讲聚焦后端能力本身），结构如下：

```
03-user-api/
├── src/
│   ├── routes/             # auth.ts / users.ts
│   ├── controllers/        # authController / userController
│   ├── services/           # userService / tokenService
│   ├── middleware/         # auth / validate / errorHandler / requestContext
│   ├── schemas/            # Zod 校验 + 类型推断
│   ├── db/store.ts         # 内存存储（用 Map 模拟数据库）
│   ├── utils/              # jwt / httpError
│   ├── types/              # 全局类型与 Express Request 扩展
│   ├── app.ts              # 中间件 + 路由装配
│   ├── seed.ts             # 默认 admin / 普通用户
│   └── index.ts            # 入口
├── requests.http           # VSCode REST Client 可直接调试
├── .env.example
└── package.json
```

运行：

```bash
cd demos/03-user-api
pnpm install
cp .env.example .env       # Windows 用 copy
pnpm dev
```

启动后控制台会打印默认账户：

```
admin@example.com / Admin1234   （admin 角色，可删除用户）
alice@example.com / Alice1234   （user 角色，只能改自己）
```

## 关键设计点

- **分层架构**：routes → controllers → services → store，与第三讲讲义一致。
- **JWT 双 Token**：access 15m + refresh 7d，refresh token 入内存"白名单"，登出可主动失效。
- **RBAC 两种姿势**：
  - `requireRole('admin')` —— 按角色
  - `requireOwnerOrAdmin(req => req.params.id)` —— 按资源所有权
- **Zod 校验中间件**：校验通过后会用 `result.data` 回填 `req.body/query`，使 `default` / `coerce` 生效。
- **统一错误处理**：业务层 throw `HttpError`，由 `errorHandler` 兜底转 JSON，并带 `requestId` 便于追踪。
- **限流**：`/api/auth/register` 与 `/api/auth/login` 走 `express-rate-limit`，15 分钟最多 20 次，防暴力破解。
- **不返回敏感字段**：`userService` 的 `toSafe()` 始终剥离 `passwordHash` / `deletedAt`。
- **Soft Delete**：删除走 `deletedAt` 标记，查询自动过滤。

## 快速验证

用 VSCode 的 [REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client) 打开 `requests.http`，依次点击各请求即可串起完整流程（登录 → 拿 Token → 调列表 → 刷新 → 注销）。
