# 全栈前端工程师培训教程

帮助前端工程师系统性地掌握全栈开发能力，覆盖前端、后端、数据库、运维、AI 应用与混合开发全链路，成为能独立交付线上产品的全栈前端工程师。

一共八讲，适合 4-6 周的系统学习。每讲包含知识讲解与课堂练习。

## 技术栈

| 层面     | 技术选型                                           |
| -------- | -------------------------------------------------- |
| 前端框架 | React 18 + TypeScript                              |
| UI & 样式 | shadcn/ui + Tailwind CSS                           |
| 状态管理 | Zustand                                            |
| 全栈框架 | Next.js / Vite                                     |
| 后端运行时 | Node.js                                           |
| API 框架 | Express / Hono                                     |
| 数据库   | PostgreSQL + Drizzle ORM                           |
| 容器化   | Docker + docker-compose                            |
| AI 集成  | Vercel AI SDK + OpenAI / Claude API                |
| 部署     | Vercel / 阿里云 / 腾讯云                           |

## 学员要求

本培训面向有 1-3 年前端经验的工程师，要求具备以下基础：

- HTML / CSS / JavaScript 基本功扎实
- 有至少一种前端框架（React / Vue）的项目经验
- 了解 Git 基本操作与命令行使用
- 有基本的 HTTP 与网络知识

## 环境准备

参加培训之前，请按照[环境准备文档](docs/preparation.md)安装所需软件。

## 课堂练习

每一讲都配有对应的[课堂练习](demos)，请在学习过程中动手完成。

---

## 第一讲：[前端基础与 React 技术栈](docs/01-react.md)

> 掌握现代 React 开发模式，构建高质量前端页面。

1. React 18 核心概念与 Hooks
2. shadcn/ui 组件库使用
3. Tailwind CSS 实用优先的样式方案
4. Zustand 状态管理
5. React Router 路由管理
6. 练习：搭建一个待办事项应用

## 第二讲：[TypeScript 深入与前端工程化](docs/02-typescript.md)

> 从"能用"到"用好"，建立类型安全的工程体系。

1. TypeScript 核心类型系统
2. 泛型、工具类型与高级模式
3. React + TypeScript 最佳实践
4. Vite 构建体系与配置
5. ESLint + Prettier 代码规范
6. 练习：为现有 JS 项目迁移 TypeScript

## 第三讲：[Node.js 后端开发](docs/03-node.md)

> 从前端出发，掌握后端 API 开发的核心能力。

1. 前端与后端的思维差异
2. Node.js 运行时与事件循环
3. 一个请求的完整生命周期
4. Express 框架搭建 REST API（分层架构、路由设计、分页）
5. 中间件机制（CORS、日志、错误处理）
6. 鉴权方案详解（密码安全、JWT 原理、双 Token 刷新、Session 对比）
7. 权限控制 RBAC（角色鉴权、资源所有权）
8. 安全防护清单
9. 数据校验（Zod）与统一错误处理
10. 练习：实现完整鉴权的用户管理 REST API

## 第四讲：[数据库与数据建模](docs/04-database.md)

> 理解关系型数据库，掌握从建模到运维的全流程。

1. PostgreSQL 基础与 SQL 语法（前端视角类比）
2. 数据建模与表设计（实体关系、索引原理）
3. Drizzle ORM 使用（Schema、连接、完整 CRUD）
4. 事务详解（ACID 原理、真实业务场景）
5. 并发控制（丢失更新图解、隔离级别、乐观锁 vs 悲观锁、死锁预防）
6. N+1 查询问题与解决方案
7. 数据迁移（Migration）与种子数据
8. 幂等设计与 Soft Delete
9. 练习：设计含事务和并发控制的多租户 SaaS 数据模型

## 第五讲：[Docker 与部署运维](docs/05-docker.md)

> 能独立搭建开发环境，完成从本地到线上的全流程部署。

1. 为什么前端工程师要学 Docker（"我电脑上能跑啊"经典问题）
2. Docker 心智模型（镜像 vs 容器图解、端口映射、Volume、Network）
3. 第一个 Docker 体验（5 分钟启动 PostgreSQL + Redis）
4. Dockerfile 编写与逐行解读（多阶段构建、缓存原理）
5. docker-compose 编排多服务（服务通信、健康检查）
6. 开发环境 vs 生产环境的 Docker 配置差异
7. 环境变量管理与多环境配置
8. 常见问题排查（端口冲突、镜像拉取慢、容器间通信）
9. Vercel / 云服务器部署
10. Nginx 反向代理与 HTTPS
11. CI/CD 基础（GitHub Actions）
12. 练习：用 Docker 容器化一个全栈应用并部署

## 第六讲：[AI 应用工程](docs/06-ai.md)

> 将 AI 能力集成到实际产品中，而不仅仅是调 API。

1. AI 对前端工程师意味什么（三个层次）
2. AI 大模型工作原理（前端能理解的版本）
3. Prompt Engineering 基础（角色设定、Few-shot、CoT、格式约束）
4. 费用管理与成本意识（Token 计费、模型价格对比、省钱技巧）
5. RAG 检索增强生成入门（原理图解、简单实现）
6. MCP（Model Context Protocol）简介
7. AI 产品中的真实场景（智能客服、内容生成、数据分析）
8. Vercel AI SDK 集成（文本生成、流式响应）
9. 结构化输出与 Function Calling
10. 上下文管理与多轮对话
11. 流式响应与前端渲染
12. 失败兜底、降级策略与回归验证
13. AI 工具链：Cursor / Claude / ChatGPT 实际工作流
14. 练习：构建一个 AI 驱动的知识问答应用

## 第七讲：[混合应用与 WebView](docs/07-hybrid.md)

> 理解 Web 与 Native 的交互边界，处理混合开发中的实际问题。

1. 前端工程师为什么要了解混合开发（微信 H5 就是 WebView）
2. 从你熟悉的场景开始理解（微信 JS-SDK = JS Bridge）
3. H5 页面在不同"容器"中的表现差异（UA 检测、环境判断）
4. 调试 WebView 中的 H5 页面（Safari DevTools、vConsole、Charles）
5. H5 适配实战经验（Safe Area、滚动穿透、1px 边框、键盘问题）
6. WKWebView 与 Web 页面交互
7. JS Bridge 原理与实现（统一 SDK）
8. URL Scheme 与 Deep Link
9. Web ↔ Native 通信协议设计
10. 性能优化：WebView 加载优化（预热、离线包、首屏）
11. iOS / Swift / SwiftUI 基础（能读懂即可）
12. 常见问题与解决方案
13. 练习：实现一个 Web ↔ Native 双向通信的 Demo

## 第八讲：[生产实战与可观测性](docs/08-production.md)

> 写完代码只是开始，保障线上稳定运行才是终点。

1. 从"前端思维"到"生产思维"的转变
2. Linux 基础命令速查（ssh、top、tail、grep、curl、netstat）
3. 健康检查详解（存活/就绪/启动检查、完整实现）
4. 日志体系设计与查询（结构化日志、如何读懂日志）
5. 前端错误监控（Sentry 接入、Source Map）
6. 监控、Trace 与报警（Prometheus + Grafana）
7. 性能排查：内存、CPU、慢查询、连接数
8. 缓存策略：Redis / 本地缓存
9. 限流、超时、降级与熔断
10. 灰度发布与回滚
11. 线上故障完整排查过程（实战故事）
12. 故障复盘模板
13. 云产品基础：OSS / WAF / SLB / 数据库
14. 练习：为应用接入日志 + 监控 + 报警全链路

---

## 推荐学习路线

```
第 1 周：第一讲（React）+ 第二讲（TypeScript）
第 2 周：第三讲（Node.js）+ 第四讲（数据库）
第 3 周：第五讲（Docker）+ 第六讲（AI）
第 4 周：第七讲（混合应用）+ 第八讲（生产实战）
第 5-6 周：综合项目实战
```

## 综合项目

完成八讲学习后，请独立完成一个综合项目，覆盖全栈能力：

**项目选题参考：**

- 📋 团队协作工具（审批 / 任务看板 / 日历）
- 💬 IM 即时通讯应用
- 🤖 AI 助手应用（带多轮对话 + 工具调用）
- 📊 数据仪表盘（含权限 + 多租户）

**综合项目要求：**

- React + TypeScript + shadcn/ui 前端
- Node.js REST API 后端
- PostgreSQL 数据库
- Docker 容器化 + CI/CD 部署
- 至少一个 AI 功能模块
- 日志与基础监控

## 参考资源

- [阮一峰 - 全栈工程师培训材料](https://github.com/ruanyf/jstraining)
- [程序员鱼皮 - 编程宝典](https://github.com/liyupi/codefather)
- [React 官方文档](https://react.dev)
- [Next.js 官方文档](https://nextjs.org/docs)
- [shadcn/ui](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Zustand](https://zustand-demo.pmnd.rs)
- [Drizzle ORM](https://orm.drizzle.team)
- [Vercel AI SDK](https://sdk.vercel.ai)
- [Docker 官方文档](https://docs.docker.com)
- [PostgreSQL 教程](https://www.postgresqltutorial.com)

## License

MIT
