# 练习 6：AI 知识问答应用

使用 Vercel AI SDK 构建一个完整的 AI 聊天应用，包含流式输出、工具调用和错误处理。

## 目标

掌握 AI 应用工程的核心能力：模型集成、流式响应、结构化输出、Function Calling、降级兜底。

## 要求

1. React 前端：流式聊天界面，支持 Markdown 渲染
2. Express 后端：对接 OpenAI / Claude API
3. 多轮对话：维护会话上下文
4. 结构化输出：至少一个功能使用 `generateObject`
5. 工具调用：至少集成一个外部工具
6. 错误处理：重试 + 降级 + 友好提示

## 参考实现

本目录提供了一份完整可运行的参考实现，分为前后端两个子项目：

```
06-ai-chat/
├── api/                # Express + Vercel AI SDK 后端
│   ├── src/
│   │   ├── routes/
│   │   │   ├── chat.ts        # 流式聊天 + 工具调用 + 降级
│   │   │   └── recipe.ts      # 结构化输出（generateObject）
│   │   ├── tools/
│   │   │   ├── weather.ts     # 模拟天气工具
│   │   │   └── time.ts        # 当前时间工具
│   │   ├── ai/
│   │   │   ├── models.ts      # 模型抽象 + 降级链
│   │   │   ├── retry.ts       # 指数退避重试
│   │   │   └── toolCompat.ts  # 第三方接口 tool calling 兼容
│   │   └── index.ts
│   ├── .env.example
│   └── package.json
├── web/                # Vite + React 前端
│   ├── src/
│   │   ├── App.tsx
│   │   ├── ChatView.tsx       # useChat + Markdown 流式渲染
│   │   ├── RecipeView.tsx     # 结构化输出演示
│   │   └── main.tsx
│   ├── vite.config.ts         # 把 /api 代理到 8080
│   └── package.json
└── README.md
```

## 环境要求

| 工具 | 版本要求 | 说明 |
|------|----------|------|
| **Node.js** | `>= 18`（推荐 **20 LTS** 或 **22 LTS**） | 后端用 `tsx` 直接跑 TS；`@types/node` 按 22 编写 |
| **pnpm** | `>= 8`（推荐 **9+**） | 前后端各自独立 `pnpm install`，无 workspace 根目录 |
| **TypeScript** | `^5.6` | 前后端均含 `typecheck` / `build` 脚本 |

**主要依赖版本（参考 `package.json`）：**

| 层级 | 关键包 |
|------|--------|
| 后端 `api/` | Express 4、Vercel AI SDK `ai@4`、`@ai-sdk/openai` / `@ai-sdk/anthropic`、Zod 3 |
| 前端 `web/` | React 18、Vite 5、`@ai-sdk/react`、`react-markdown` |

**安装 pnpm（若尚未安装）：**

```bash
npm install -g pnpm
# 或使用 Corepack（Node 16.13+ 自带）
corepack enable
corepack prepare pnpm@latest --activate
```

**版本自检：**

```bash
node -v    # 期望 v18+，如 v22.22.0
pnpm -v    # 期望 8+，如 10.x
```

**默认端口：**

| 服务 | 地址 |
|------|------|
| 后端 API | `http://localhost:8080` |
| 前端 Web | `http://localhost:5173`（Vite 将 `/api/*` 代理到 8080） |

## 快速开始

**后端：**

```bash
cd demos/06-ai-chat/api
pnpm install
cp .env.example .env       # Windows: copy .env.example .env
# 编辑 .env 填入 OPENAI_API_KEY（或同时配置 ANTHROPIC_API_KEY 作为降级）
pnpm dev                   # 启动后端 http://localhost:8080
```

**前端：**

```bash
cd demos/06-ai-chat/web
pnpm install
pnpm dev                   # 前端 http://localhost:5173
```

打开浏览器访问前端，左侧标签可切换聊天 / 食谱生成。

## 环境变量

```bash
# api/.env
OPENAI_API_KEY=sk-xxx
# 可选：第三方 OpenAI 兼容接口（如 gptgod）
OPENAI_BASE_URL=https://api.gptgod.online/v1
# 可选：模型 ID（gptgod 需在控制台为 Key 添加对应模型白名单）
OPENAI_MODEL=gpt-3.5-turbo-16k
# 可选：声明任意一个即可启用模型降级链
ANTHROPIC_API_KEY=sk-ant-xxx
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
PORT=8080
```

`.env.example` 仅提供变量名与注释，**不要**把真实 Key 写进去；本地复制为 `.env` 后再填入。

## 密钥安全

API Key 只应存在于**后端** `api/.env`，由 `dotenv` 在服务端读取。**前端代码和浏览器里不应出现任何 Key。**

### 必须遵守

1. **`.env` 不入库** — `api/.gitignore` 已忽略 `.env`；只提交 `.env.example`（占位符如 `sk-xxx`）。
2. **`.env.example` 不放真实 Key** — 它是给协作者看的模板，误填真实 Key 等于公开泄露。
3. **Key 仅在后端使用** — 本项目的 `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` 只在 `api/src/` 中通过 `process.env` 读取；前端通过 Vite 代理访问 `/api/chat`，不直连模型厂商。
4. **禁止 `VITE_` 前缀暴露 Key** — 凡以 `VITE_` 开头的变量会被 Vite 打包进前端 bundle，**切勿**用这种方式传 API Key。
5. **提交前自查** — 推送前执行 `git status`，确认 `.env` 未被 staged；可用 `git check-ignore -v api/.env` 验证 ignore 规则生效。

### 推荐做法

- **最小权限 Key**：在 OpenAI / Anthropic / 第三方控制台为 Key 设置模型白名单、用量上限；演示用 Key 与生产 Key 分离。
- **泄露后立刻轮换**：若 Key 曾出现在截图、聊天记录、PR 或 `.env.example` 中，立即在控制台作废并生成新 Key。
- **本地与 CI 分离**：本地用 `api/.env`；CI / 部署用平台「Secrets / 环境变量」，不要复制 `.env` 文件到服务器仓库目录。
- **日志与报错不打印 Key** — 本项目接口错误只返回 `error.message`，不会回显 `Authorization` 头；自行扩展日志时注意脱敏。
- **curl / 文档示例用占位符** — 调试命令里写 `sk-xxx`，不要粘贴真实 Key（PowerShell 历史、终端录屏也会留存）。

### 若 Key 已经泄露

1. 在对应平台**立即 revoke / 删除**该 Key。
2. 生成新 Key，只写入本地 `api/.env`（不要提交）。
3. 若曾 push 到 Git：`git log -p -- api/.env` 检查历史；必要时用 `git filter-repo` 或平台 Secret Scanning 处理，并轮换 Key（改历史仍无法保证无人已复制）。

## 调试小贴士

- 前端 Vite 会把 `/api/*` 代理到 `http://localhost:8080`，所以浏览器 Network 里看到的是 `5173`，实际请求会转发到 8080。后端终端应看到 `[timestamp] POST /api/chat` 日志。
- 先确认后端存活：`curl http://localhost:8080/api/health`
- 排查 chat 报错时，直接测上游接口（PowerShell 建议用 `--data-binary @body.json` 避免转义问题）：
  ```bash
  curl https://api.gptgod.online/v1/models -H "Authorization: Bearer sk-xxx"
  curl -X POST https://api.gptgod.online/v1/chat/completions \
    -H "Authorization: Bearer sk-xxx" \
    -H "Content-Type: application/json" \
    -d '{"model":"gpt-3.5-turbo-16k","messages":[{"role":"user","content":"hi"}]}'
  ```
- **gptgod 常见错误 `code:-31`**：API Key 限制了可访问模型。请在 gptgod 控制台取消限制，或把 `OPENAI_MODEL` 改成 `/v1/models` 返回列表中的模型。
- **第三方接口不支持 function calling**：配置 `OPENAI_BASE_URL` 时，聊天里的天气/时间走 `toolCompat.ts` 服务端预执行；食谱接口需 `generateObject({ mode: 'json' })`。官方 OpenAI 可不填 `OPENAI_BASE_URL` 以使用原生 tool calling。
- 没有 OpenAI Key 时，把 `OPENAI_API_KEY` 设为任意值并把 `OPENAI_MODEL=gpt-4o-mini`，再用 mock provider 替换 `api/src/ai/models.ts` 中的 model，即可在无 Key 场景演示。
- 想看完整 SSE 报文：`curl -N -X POST http://localhost:8080/api/chat -H "Content-Type: application/json" --data-binary @test-body.json`（`test-body.json` 内容为 `{"messages":[{"role":"user","content":"hi"}]}`）

## 关键设计点

- **流式输出**：后端 `streamText({...}).pipeDataStreamToResponse(res)`，前端 `useChat` 自动消费 SSE。
- **工具调用**：`getWeather` / `getCurrentTime` 两个示例 tool；官方 OpenAI 由模型按需调用，第三方兼容接口由 `toolCompat.ts` 预执行后注入上下文。
- **结构化输出**：`/api/recipe` 用 `generateObject + zodSchema`（第三方接口建议 `mode: 'json'`），返回严格符合 schema 的食谱 JSON。
- **重试 + 降级**：可重试错误（429/500/503）走指数退避；主模型失败自动切换备用模型。
- **错误兜底**：流式接口异常时返回友好兜底文案；前端 useChat 也有 `error` 状态展示。
- **多轮上下文**：`useChat` 自带 messages 数组，每次请求把完整历史发送给后端。

## 验证标准

- [ ] 能正常进行多轮对话
- [ ] 流式输出体验流畅（逐字显示）
- [ ] 工具调用正确触发并返回结果（问"北京几点了/天气怎么样"试试）
- [ ] Markdown 内容正确渲染（代码块、列表等）
- [ ] 网络异常时有友好的错误提示
- [ ] 代码无 TypeScript 报错
