/**
 * 天气 tool 示例 — AI SDK tool() 标准写法。
 *
 * 注册方式：chat.ts 的 streamText({ tools: { getWeather: weatherTool } })
 * 二次开发：把 FAKE_DB + execute 替换为真实天气 API 即可。
 */
import { tool } from 'ai'
import { z } from 'zod'

interface WeatherSnapshot {
  city: string
  description: string
  temperatureC: number
  humidity: number
  updatedAt: string
}

/** 演示用静态数据；生产环境应请求 OpenWeather 等外部 API */
const FAKE_DB: Record<string, Omit<WeatherSnapshot, 'city' | 'updatedAt'>> = {
  北京: { description: '晴', temperatureC: 18, humidity: 35 },
  上海: { description: '多云', temperatureC: 22, humidity: 60 },
  广州: { description: '小雨', temperatureC: 26, humidity: 80 },
  深圳: { description: '阴', temperatureC: 25, humidity: 75 }
}

export const weatherTool = tool({
  description: '查询指定城市的当前天气（仅支持中国城市的演示数据）',
  // parameters 的 zod schema 会转为 JSON Schema 供模型理解入参
  parameters: z.object({
    city: z.string().describe('城市名称，例如：北京、上海')
  }),
  execute: async ({ city }): Promise<WeatherSnapshot> => {
    const snapshot = FAKE_DB[city] ?? {
      description: '晴',
      temperatureC: 20,
      humidity: 50
    }
    return {
      city,
      ...snapshot,
      updatedAt: new Date().toISOString()
    }
  }
})
