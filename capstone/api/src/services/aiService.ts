import { generateObject } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { z } from 'zod'
import { config } from '../config.js'
import { logger } from '../lib/logger.js'
import { aiBreakdownTotal } from '../lib/metrics.js'

export const breakdownSchema = z.object({
  tasks: z
    .array(
      z.object({
        title: z.string().min(1).max(100).describe('可执行的子任务标题，动词开头'),
        priority: z.enum(['low', 'medium', 'high']),
        estimateHours: z.number().min(0.5).max(40).describe('预估工时（小时）')
      })
    )
    .min(1)
    .max(8)
})

export type Breakdown = z.infer<typeof breakdownSchema> & { source: 'ai' | 'fallback'; model?: string }

const log = logger.child({ module: 'ai' })

const model = config.ai.apiKey
  ? createOpenAI({ apiKey: config.ai.apiKey, baseURL: config.ai.baseURL })(config.ai.model)
  : null

/** 规则兜底：模型不可用时也给出可用的结果，而不是报错 */
export function fallbackBreakdown(goal: string): Breakdown {
  const parts = goal
    .split(/[，,；;。、\n]|并且|然后/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6)
  const titles =
    parts.length > 1
      ? parts
      : [`明确「${goal}」的目标和验收标准`, `拆解并实现「${goal}」`, `测试「${goal}」`, `上线并复盘「${goal}」`]
  return {
    source: 'fallback',
    tasks: titles.map((title, i) => ({
      title: title.slice(0, 100),
      priority: i === 0 ? 'high' : 'medium',
      estimateHours: 2
    }))
  }
}

export async function breakdownGoal(goal: string): Promise<Breakdown> {
  if (!model) {
    aiBreakdownTotal.inc({ source: 'fallback' })
    return fallbackBreakdown(goal)
  }
  try {
    const { object, usage } = await generateObject({
      model,
      schema: breakdownSchema,
      // 'json' 模式对第三方 OpenAI 兼容接口更友好
      mode: 'json',
      maxRetries: 2,
      abortSignal: AbortSignal.timeout(20_000),
      system:
        '你是资深项目经理。把用户的目标拆成 3-6 个可以独立完成的子任务，按执行顺序排列。只输出符合 schema 的 JSON。',
      prompt: `目标：${goal}`
    })
    log.info({ model: config.ai.model, tokens: usage.totalTokens }, 'breakdown generated')
    aiBreakdownTotal.inc({ source: 'ai' })
    return { ...object, source: 'ai', model: config.ai.model }
  } catch (err) {
    log.warn({ err: (err as Error).message }, 'AI breakdown failed, using fallback')
    aiBreakdownTotal.inc({ source: 'fallback' })
    return fallbackBreakdown(goal)
  }
}
