/**
 * 第三方 OpenAI 兼容接口的 tool calling 兼容层。
 *
 * 背景：gptgod 等中转 API 会忽略 tools 参数，模型只返回普通文本。
 * 策略：根据用户最后一句话做意图识别 → 服务端直接 execute tool
 *       → 把 JSON 结果拼进 system prompt → 再 streamText 生成回答。
 *
 * 局限：依赖关键词/正则，前端不会收到 SSE 的 toolInvocations 事件。
 * 扩展：增城市改 KNOWN_CITIES；增时区改 TZ_HINTS；或换 LLM 做 intent 分类。
 */
import type { CoreMessage, TextPart, UserContent } from 'ai'
import { weatherTool } from '../tools/weather.js'
import { timeTool } from '../tools/time.js'

const KNOWN_CITIES = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '西安', '重庆']

const TZ_HINTS: Array<{ pattern: RegExp; timezone: string }> = [
  { pattern: /北京(?:时间)?/, timezone: 'Asia/Shanghai' },
  { pattern: /上海(?:时间)?/, timezone: 'Asia/Shanghai' },
  { pattern: /美国(?:时间)?|美东|纽约|东部(?:时间)?/, timezone: 'America/New_York' },
  { pattern: /美西|洛杉矶|太平洋(?:时间)?/, timezone: 'America/Los_Angeles' },
  { pattern: /伦敦|英国(?:时间)?/, timezone: 'Europe/London' },
  { pattern: /东京|日本(?:时间)?/, timezone: 'Asia/Tokyo' }
]

export interface ToolRun {
  toolName: string
  args: Record<string, unknown>
  result: unknown
}

/** 配置了 OPENAI_BASE_URL 即视为第三方，启用 compat 路径 */
export function needsToolCompat(): boolean {
  return Boolean(process.env.OPENAI_BASE_URL?.trim())
}

function userText(content: UserContent): string {
  if (typeof content === 'string') return content
  return content
    .filter((part): part is TextPart => part.type === 'text')
    .map((part) => part.text)
    .join('')
}

/** 从多轮 messages 中取最后一条 user 文本（useChat 会带完整历史） */
function getLastUserText(messages: CoreMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role === 'user') return userText(message.content)
  }
  return ''
}

function extractCities(text: string): string[] {
  if (!/天气|气温|温度|下雨|下雪/.test(text)) return []

  const matched = KNOWN_CITIES.filter((city) => text.includes(city))
  if (matched.length > 0) return matched

  const cityMatch = text.match(/([\u4e00-\u9fa5]{2,4})(?:今天|现在)?(?:的)?(?:天气|气温|温度)/)
  if (cityMatch) return [cityMatch[1]]

  // 未识别到具体城市时默认北京，避免空跑
  return ['北京']
}

function extractTimezones(text: string): string[] {
  const asksTime =
    /几点|什么时间|现在.*时间|当前时间|几点了/.test(text) ||
    TZ_HINTS.some(({ pattern }) => pattern.test(text))
  if (!asksTime) return []

  const matched = TZ_HINTS.filter(({ pattern }) => pattern.test(text)).map(({ timezone }) => timezone)
  if (matched.length > 0) return [...new Set(matched)]

  // 问「几点了」但未指定时区 → 默认北京时间
  return ['Asia/Shanghai']
}

async function runTool(
  toolName: 'getWeather' | 'getCurrentTime',
  args: Record<string, unknown>,
  messages: CoreMessage[],
  toolCallId: string
): Promise<unknown> {
  const options = { toolCallId, messages }
  if (toolName === 'getWeather') {
    return weatherTool.execute!({ city: String(args.city) }, options)
  }
  return timeTool.execute!(
    args.timezone ? { timezone: String(args.timezone) } : {},
    options
  )
}

export async function preInvokeToolsForCompat(messages: CoreMessage[]): Promise<{
  augmentedMessages: CoreMessage[]
  toolRuns: ToolRun[]
  toolContext: string
}> {
  const text = getLastUserText(messages)
  if (!text) return { augmentedMessages: messages, toolRuns: [], toolContext: '' }

  const toolRuns: ToolRun[] = []

  for (const city of extractCities(text)) {
    const args = { city }
    const result = await runTool('getWeather', args, messages, `compat-weather-${city}`)
    toolRuns.push({ toolName: 'getWeather', args, result })
  }

  for (const timezone of extractTimezones(text)) {
    const args = { timezone }
    const result = await runTool('getCurrentTime', args, messages, `compat-time-${timezone}`)
    toolRuns.push({ toolName: 'getCurrentTime', args, result })
  }

  if (toolRuns.length === 0) {
    return { augmentedMessages: messages, toolRuns: [], toolContext: '' }
  }

  // 注入 system 而非 tool role 消息：第三方接口无法解析 tool-call 格式
  const toolContext = toolRuns
    .map(
      (run) =>
        `[${run.toolName}(${JSON.stringify(run.args)}) 返回]\n${JSON.stringify(run.result, null, 2)}`
    )
    .join('\n\n')

  return {
    augmentedMessages: messages,
    toolRuns,
    toolContext
  }
}

export const COMPAT_SYSTEM_PROMPT = `你是一个友好的中文 AI 助手。
- 消息历史中若已包含工具调用结果，必须基于工具返回的数据回答，不要说“无法获取实时信息”。
- Markdown 格式输出，必要时使用列表与代码块。
- 不知道的事情诚实说不知道。`
