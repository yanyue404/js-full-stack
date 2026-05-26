/**
 * API 入口：Express 挂载聊天 / 食谱两条路由。
 * 开发时前端 Vite 代理 /api → 8080，此处 cors 允许跨域便于独立调试。
 */
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.js'
import recipeRouter from './routes/recipe.js'

const app = express()
const port = Number(process.env.PORT ?? 8080)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.use((req, _res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`)
  }
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', chatRouter)   // POST /api/chat  — 流式 SSE + 工具调用
app.use('/api', recipeRouter) // POST /api/recipe — 结构化 JSON（generateObject）

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(port, () => {
  console.log(`AI Chat API listening on http://localhost:${port}`)
})
