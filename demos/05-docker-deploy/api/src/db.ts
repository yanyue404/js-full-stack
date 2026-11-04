import postgres from 'postgres'
import { PGlite } from '@electric-sql/pglite'
import { sql } from 'drizzle-orm'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

const url = process.env.DATABASE_URL

// ponytail: 本地没有 Docker 时回退到 PGlite（./.pglite），容器内始终走 DATABASE_URL
export const db = url
  ? drizzlePg(postgres(url))
  : (drizzlePglite(new PGlite('./.pglite')) as unknown as ReturnType<typeof drizzlePg>)

// ponytail: 单表直接建表，迁移体系见练习 4（drizzle-kit）
export async function ensureSchema() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      email text NOT NULL UNIQUE,
      created_at timestamptz NOT NULL DEFAULT now()
    )`)
}
