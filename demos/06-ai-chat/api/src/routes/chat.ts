import { Router } from 'express'
import { streamText, type CoreMessage } from 'ai'
import { getModelChain } from '../ai/models.js'
import { withRetry } from '../ai/retry.js'
import { weatherTool } from '../tools/weather.js'
import { timeTool } from '../tools/time.js'

const chatRouter = Router()

const SYSTEM_PROMPT = `你是一个友好的中文 AI 助手。
- 回答中如果需要实时数据（天气、时间等），优先调用可用的工具。
- Markdown 格式输出，必要时使用列表与代码块。
- 不知道的事情诚实说不知道。`

chatRouter.post('/chat', async (req, res) => {
  const messages = (req.body?.messages ?? []) as CoreMessage[]
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: 'messages is required' })
    return
  }

  const chain = getModelChain()

  let lastError: unknown
  for (const { id, model } of chain) {
    try {
      const result = await withRetry(() =>
        Promise.resolve(
          streamText({
            model,
            system: SYSTEM_PROMPT,
            messages,
            tools: {
              getWeather: weatherTool,
              getCurrentTime: timeTool
            },
            maxSteps: 4,
            onError: (event) => {
              console.error(`[chat] model ${id} stream error:`, event.error)
            }
          })
        )
      )

      result.pipeDataStreamToResponse(res)
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
