import type { z, ZodTypeAny } from 'zod'

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public detail?: unknown
  ) {
    super(message)
  }
}

/** 信任边界：所有外部输入都经过 zod 校验 */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const r = schema.safeParse(data)
  if (!r.success) throw new HttpError(400, '参数校验失败', 'VALIDATION_FAILED', r.error.flatten())
  return r.data
}
