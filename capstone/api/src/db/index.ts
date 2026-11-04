import postgres from 'postgres'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { migrate as migratePg } from 'drizzle-orm/postgres-js/migrator'
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator'
import { config } from '../config.js'
import * as schema from './schema.js'

const migrationsFolder = './drizzle'

// ponytail: 未配置 DATABASE_URL 时用 PGlite（本地开发 / 测试），生产容器始终走 PostgreSQL
const pg = config.databaseUrl ? drizzlePg(postgres(config.databaseUrl, { max: 10 }), { schema }) : null
const lite = pg ? null : drizzlePglite(new PGlite(config.pgliteDir), { schema })

export const db = (pg ?? lite) as NonNullable<typeof pg>

export async function migrateDb() {
  if (pg) await migratePg(pg, { migrationsFolder })
  else await migratePglite(lite!, { migrationsFolder })
}

export async function closeDb() {
  if (pg) await pg.$client.end()
  else await lite!.$client.close()
}

/** PostgreSQL 唯一约束冲突（drizzle 会把驱动错误包在 cause 里） */
export function isUniqueViolation(err: unknown) {
  const e = err as { code?: string; cause?: { code?: string } }
  return e?.code === '23505' || e?.cause?.code === '23505'
}
