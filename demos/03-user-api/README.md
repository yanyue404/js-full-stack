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
