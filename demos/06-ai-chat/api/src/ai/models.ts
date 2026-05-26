/**
 * 模型 Provider 抽象 + 降级链。
 *
 * getModelChain() 按 .env 配置返回有序列表，路由层 for-loop 依次尝试。
 * 扩展新 Provider（如 DeepSeek）：参照下方 createOpenAI 模式 push 进 chain 即可。
 */
import { createOpenAI } from '@ai-sdk/openai'
import { createAnthropic } from '@ai-sdk/anthropic'
import type { LanguageModel } from 'ai'

export interface ConfiguredModel {
  id: string
  model: LanguageModel
}

/** 将完整 endpoint 或带尾斜杠的地址规范为 OpenAI SDK 所需的 baseURL（不含 /chat/completions） */
function resolveOpenAIBaseURL(): string | undefined {
  const raw = process.env.OPENAI_BASE_URL?.trim()
  if (!raw) return undefined
  return raw.replace(/\/chat\/completions\/?$/i, '').replace(/\/$/, '')
}

export function getModelChain(): ConfiguredModel[] {
  const chain: ConfiguredModel[] = []

  // 主模型：OpenAI 或任意 OpenAI 兼容接口（gptgod 等通过 OPENAI_BASE_URL 指向）
  if (process.env.OPENAI_API_KEY) {
    const baseURL = resolveOpenAIBaseURL()
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      ...(baseURL ? { baseURL } : {})
    })
    const id = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
    chain.push({ id: `openai:${id}`, model: openai(id) })
  }

  // 备用模型：主模型失败时自动降级（需单独配置 ANTHROPIC_API_KEY）
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
