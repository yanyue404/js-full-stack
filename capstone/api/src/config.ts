import 'dotenv/config'

const env = process.env.NODE_ENV ?? 'development'
const isProd = env === 'production'

const jwtSecret = process.env.JWT_SECRET || (isProd ? '' : 'dev-secret-change-me-dev-secret-change-me')
if (jwtSecret.length < 32) throw new Error('JWT_SECRET 必须设置且至少 32 位')

export const config = {
  env,
  isProd,
  port: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL,
  pgliteDir: process.env.PGLITE_DIR ?? './.pglite',
  jwtSecret,
  jwtExpiresIn: '8h' as const,
  logLevel: process.env.LOG_LEVEL ?? (env === 'test' ? 'silent' : 'info'),
  ai: {
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL?.replace(/\/chat\/completions\/?$/i, '').replace(/\/$/, '') || undefined,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini'
  }
}
