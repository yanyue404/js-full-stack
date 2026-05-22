import { tool } from 'ai'
import { z } from 'zod'

interface WeatherSnapshot {
  city: string
  description: string
  temperatureC: number
  humidity: number
  updatedAt: string
}

const FAKE_DB: Record<string, Omit<WeatherSnapshot, 'city' | 'updatedAt'>> = {
  北京: { description: '晴', temperatureC: 18, humidity: 35 },
  上海: { description: '多云', temperatureC: 22, humidity: 60 },
  广州: { description: '小雨', temperatureC: 26, humidity: 80 },
  深圳: { description: '阴', temperatureC: 25, humidity: 75 }
}

export const weatherTool = tool({
  description: '查询指定城市的当前天气（仅支持中国城市的演示数据）',
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
