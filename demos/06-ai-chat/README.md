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
│   │   │   └── retry.ts       # 指数退避重试
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
# 可选：声明任意一个即可启用模型降级链
ANTHROPIC_API_KEY=sk-ant-xxx
# 可选：自定义模型 ID
OPENAI_MODEL=gpt-4o-mini
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022
PORT=8080
```

## 关键设计点

- **流式输出**：后端 `streamText({...}).pipeDataStreamToResponse(res)`，前端 `useChat` 自动消费 SSE。
- **工具调用**：`getWeather` / `getCurrentTime` 两个示例 tool，由模型按需调用，前端可读取 `parts` 看调用过程。
- **结构化输出**：`/api/recipe` 用 `generateObject + zodSchema`，返回严格符合 schema 的食谱 JSON。
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

## 调试小贴士

- 没有 OpenAI Key 时，把 `OPENAI_API_KEY` 设为任意值并把 `OPENAI_MODEL=gpt-4o-mini`，再用 mock provider 替换 `api/src/ai/models.ts` 中的 model，即可在无 Key 场景演示。
- 想看完整 SSE 报文：`curl -N -X POST http://localhost:8080/api/chat -H "Content-Type: application/json" -d '{"messages":[{"role":"user","content":"hi"}]}'`
