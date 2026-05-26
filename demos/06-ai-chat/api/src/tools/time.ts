/**
 * 时间 tool — 读取服务器当前时间，支持 IANA 时区。
 * toolCompat 会通过关键词映射时区后调用此 execute。
 */
import { tool } from 'ai'
import { z } from 'zod'

export const timeTool = tool({
  description: '获取当前服务器时间，可指定时区（IANA tz 名称，如 Asia/Shanghai）',
  parameters: z.object({
    timezone: z
      .string()
      .optional()
      .describe('IANA 时区名，如 Asia/Shanghai；不填则使用服务器默认时区')
  }),
  execute: async ({ timezone }) => {
    try {
      const now = new Date()
      const formatter = new Intl.DateTimeFormat('zh-CN', {
        timeZone: timezone,
        dateStyle: 'full',
        timeStyle: 'long'
      })
      return {
        iso: now.toISOString(),
        formatted: formatter.format(now),
        timezone: timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      }
    } catch (err) {
      return {
        error: `无法解析时区：${timezone}`,
        detail: (err as Error).message
      }
    }
  }
})
