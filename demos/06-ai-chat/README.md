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

## 快速开始

```bash
mkdir ai-chat && cd ai-chat

# 后端
mkdir api && cd api
pnpm init
pnpm add express cors ai @ai-sdk/openai zod
pnpm add -D typescript @types/express @types/cors tsx

# 前端
cd ..
pnpm create vite web --template react-ts
cd web
pnpm add ai react-markdown
```

## 环境变量

```bash
# api/.env
OPENAI_API_KEY=sk-xxx
# 或
ANTHROPIC_API_KEY=sk-ant-xxx
```

## 验证标准

- [ ] 能正常进行多轮对话
- [ ] 流式输出体验流畅（逐字显示）
- [ ] 工具调用正确触发并返回结果
- [ ] Markdown 内容正确渲染（代码块、列表等）
- [ ] 网络异常时有友好的错误提示
- [ ] 代码无 TypeScript 报错
