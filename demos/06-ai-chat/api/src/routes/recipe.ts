import { Router } from 'express'
import { generateObject } from 'ai'
import { z } from 'zod'
import { getModelChain } from '../ai/models.js'
import { withRetry } from '../ai/retry.js'

const recipeRouter = Router()

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
          system: '你是一位中餐主厨，输出严格符合 schema 的食谱 JSON。',
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
