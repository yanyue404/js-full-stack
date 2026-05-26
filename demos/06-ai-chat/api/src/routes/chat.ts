/**
 * 聊天路由：streamText 流式输出，对接前端 useChat 消费的 AI SDK Data Stream。
 *
 * 请求体：{ messages: CoreMessage[] } — useChat 每次会把完整多轮历史发来。
 * 响应：SSE 数据流（pipeDataStreamToResponse），不是普通 JSON。
 *
 * 扩展点：
 * - 新增 tool → tools/ 定义后在下方 tools 注册；第三方接口见 toolCompat
 * - 新增模型 → .env 配置 + ai/models.ts getModelChain
 */
import { Router } from 'express'
import { streamText, type CoreMessage } from 'ai'
import { getModelChain } from '../ai/models.js'
import { withRetry } from '../ai/retry.js'
import {
  COMPAT_SYSTEM_PROMPT,
  needsToolCompat,
  preInvokeToolsForCompat
} from '../ai/toolCompat.js'
import { weatherTool } from '../tools/weather.js'
import { timeTool } from '../tools/time.js'

const chatRouter = Router()

const SYSTEM_PROMPT = `你是一个友好的中文 AI 助手。
- 回答中如果需要实时数据（天气、时间等），必须调用 getWeather / getCurrentTime 工具，不要编造。
- Markdown 格式输出，必要时使用列表与代码块。
- 不知道的事情诚实说不知道。`

function formatStreamError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  console.error('[chat] stream error:', error)
  return message || 'AI 服务暂时不可用，请稍后再试。'
}

chatRouter.post('/chat', async (req, res) => {
  const messages = (req.body?.messages ?? []) as CoreMessage[]
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages is required' })
    return
  }

  const chain = getModelChain()

  // 第三方 OpenAI 兼容接口（OPENAI_BASE_URL）不支持 function calling 时，
  // 在服务端预执行 tool，把结果注入 system，再流式生成最终回答。
  const toolCompat = needsToolCompat()
  const { augmentedMessages, toolRuns, toolContext } = toolCompat
    ? await preInvokeToolsForCompat(messages)
    : { augmentedMessages: messages, toolRuns: [], toolContext: '' }

  const system =
    toolRuns.length > 0
      ? `${COMPAT_SYSTEM_PROMPT}\n\n以下工具结果供参考：\n${toolContext}`
      : SYSTEM_PROMPT

  // 按配置顺序尝试模型链：OpenAI → Anthropic，前一个失败才切下一个
  let lastError: unknown
  for (const { id, model } of chain) {
    try {
      const result = await withRetry(() =>
        Promise.resolve(
          streamText({
            model,
            system,
            messages: augmentedMessages,
            // 官方 OpenAI：走原生 tool calling + 多步推理（模型调 tool → 拿结果 → 再回答）
            // 第三方 compat：不传 tools，避免上游忽略 tools 参数导致空响应
            ...(toolCompat
              ? {}
              : {
                  tools: {
                    getWeather: weatherTool,
                    getCurrentTime: timeTool
                  },
                  maxSteps: 4 // 允许多轮 tool call，如先查天气再查时间
                })
          })
        )
      )

      // 将 AI SDK 数据流写入 Express Response，前端 useChat 自动解析
      result.pipeDataStreamToResponse(res, {
        getErrorMessage: formatStreamError
      })
      return
    } catch (err) {
      lastError = err
      console.warn(`[chat] model ${id} failed, trying next...`, err)
    }
  }

  console.error('[chat] all models failed', lastError)
  res.status(503).json({
    error: 'AI 服务暂时不可用，请稍后再试。',
    detail: lastError instanceof Error ? lastError.message : String(lastError)
  })
})

export default chatRouter
