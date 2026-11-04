import { defineConfig } from 'drizzle-kit'

// 只用于 drizzle-kit generate 生成迁移 SQL；迁移在应用启动时执行（src/db/index.ts）
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql'
})
