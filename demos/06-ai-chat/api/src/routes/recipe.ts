/**
 * 食谱路由：generateObject 结构化输出演示。
 *
 * 与 chat 的区别：一次性返回 JSON，不走 SSE；zod schema 约束字段类型。
 * 扩展点：复制 recipeSchema 模式即可新增其他结构化能力（如行程、简历解析）。
 */
import { Router } from 'express'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getModelChain } from '../ai/models.js'
import { withRetry } from '../ai/retry.js'

const recipeRouter = Router()

// describe() 会进入 schema 提示，帮助模型理解各字段含义
const recipeSchema = z.object({
  name: z.string().describe('菜品名称'),
  cuisine: z.string().describe('菜系，如 川菜 / 粤菜'),
  difficulty: z.enum(['简单', '中等', '困难']),
  cookingMinutes: z.number().int().min(1).describe('烹饪时间（分钟）'),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        amount: z.string().describe('用量，例如 200g、1 把')
      })
    )
    .min(2),
  steps: z.array(z.string()).min(3).describe('步骤，每项一句话')
})

export type Recipe = z.infer<typeof recipeSchema>

const requestSchema = z.object({
  dish: z.string().min(1).max(50)
})

recipeRouter.post('/recipe', async (req, res) => {
  const parsed = requestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Validation failed', detail: parsed.error.flatten() })
    return
  }

  const chain = getModelChain()
  let lastError: unknown

  for (const { id, model } of chain) {
    try {
      const { object } = await withRetry(() =>
        generateObject({
          model,
          schema: recipeSchema,
          // mode 说明：
          // - 'auto'（默认）走 tool calling，第三方兼容接口常报 NoObjectGeneratedError
          // - 'json'  走 JSON 模式，兼容性更好；官方 OpenAI 也可正常工作
          mode: 'json',
          system: '你是一位中餐主厨，只输出符合 schema 的 JSON，不要 markdown 代码块或多余说明。',
          prompt: `请给我一个 "${parsed.data.dish}" 的家常做法。`
        })
      )
      res.json({ model: id, recipe: object })
      return
    } catch (err) {
      lastError = err
      console.warn(`[recipe] model ${id} failed`, err)
    }
  }

  res.status(503).json({
    error: '生成食谱失败，请稍后再试。',
    detail: lastError instanceof Error ? lastError.message : String(lastError)
  })
})

export default recipeRouter
