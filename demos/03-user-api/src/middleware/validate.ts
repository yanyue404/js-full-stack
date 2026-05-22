import type { Request, Response, NextFunction } from 'express'
import type { ZodSchema } from 'zod'

type Source = 'body' | 'query' | 'params'

export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      res.status(400).json({
        error: {
          message: 'Validation failed',
          details: result.error.flatten()
        }
      })
      return
    }
    // 校验通过后回填解析后的值，确保 default / coerce 生效
    req[source] = result.data
    next()
  }
}
