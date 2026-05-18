# 课堂练习

每一讲配有对应的实战练习，请按顺序完成。

## 练习列表

| 编号 | 练习项目                              | 对应章节       | 技术栈                                        |
| ---- | ------------------------------------- | -------------- | --------------------------------------------- |
| 01   | [Todo App](./01-todo-app)             | 第一讲 React   | React + shadcn/ui + Tailwind + Zustand        |
| 02   | [TS 迁移](./02-ts-migration)         | 第二讲 TS      | TypeScript + ESLint + Prettier + husky        |
| 03   | [用户 API](./03-user-api)            | 第三讲 Node    | Express + JWT + Zod + bcrypt                  |
| 04   | [数据库](./04-database)              | 第四讲 DB      | PostgreSQL + Drizzle ORM + 事务 + 乐观锁     |
| 05   | [Docker 部署](./05-docker-deploy)    | 第五讲 Docker  | Docker + Nginx + GitHub Actions               |
| 06   | [AI 聊天](./06-ai-chat)             | 第六讲 AI      | Vercel AI SDK + React + 流式输出              |
| 07   | [JS Bridge](./07-js-bridge)          | 第七讲 Hybrid  | JSBridge SDK + 模拟 Native 环境               |
| 08   | [可观测性](./08-observability)       | 第八讲 Prod    | Pino + Prometheus + Grafana + Redis           |

## 如何使用

每个练习目录下包含：

- `README.md` —— 练习要求、项目结构、快速开始、验证标准

按照 README 中的步骤自行从零搭建项目。每个练习都有明确的验证标准（checklist），逐项完成即可。

```bash
# 进入某个练习目录，按 README 指引操作
cd demos/01-todo-app

# 按 README 中的"快速开始"步骤创建项目
# ...

# 按"验证标准"逐项检查
```

## 练习依赖关系

```
练习 1（Todo App）
  └→ 练习 2（TS 迁移）—— 在练习 1 基础上迁移 TypeScript

练习 3（用户 API）
  └→ 练习 4（数据库）—— 为 API 接入真实数据库
      └→ 练习 5（Docker 部署）—— 将全栈应用容器化
          └→ 练习 8（可观测性）—— 为应用接入监控

练习 6（AI 聊天）—— 独立练习，可随时开始
练习 7（JS Bridge）—— 独立练习，可随时开始
```

## 建议

1. **先自己动手**：不要一开始就搜索答案
2. **善用 AI**：遇到问题先问 Cursor / Claude，培养 AI 辅助编程习惯
3. **验证标准**：每个练习都有明确的 checklist，逐项验证
4. **记录过程**：把遇到的问题和解决方案记下来，这比完成练习本身更有价值
5. **循序渐进**：练习 1-5 有依赖关系，建议按顺序完成；6 和 7 可独立进行
