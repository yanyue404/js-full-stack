import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

export interface ConfiguredModel {
  id: string
  model: LanguageModel
}

export function getModelChain(): ConfiguredModel[] {
  const chain: ConfiguredModel[] = []

  if (process.env.OPENAI_API_KEY) {
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const id = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    chain.push({ id: `openai:${id}`, model: openai(id) })
  }

  if (process.env.ANTHROPIC_API_KEY) {
    const anthropic = createAnthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const id = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022'
    chain.push({ id: `anthropic:${id}`, model: anthropic(id) })
  }

  if (chain.length === 0) {
    throw new Error(
      '未配置任何模型 Provider，请在 .env 中设置 OPENAI_API_KEY 或 ANTHROPIC_API_KEY'
    )
  }

  return chain
}
