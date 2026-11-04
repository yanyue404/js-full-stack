import 'dotenv/config'
import postgres from 'postgres'
import { PGlite } from '@electric-sql/pglite'
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js'
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite'
import type { Logger } from 'drizzle-orm/logger'
import * as schema from './schema.js'

/** 每条 SQL 都会计数，用来验证"列表查询无 N+1" */
export const queryStats = { count: 0, verbose: false }
const logger: Logger = {
  logQuery(query) {
    queryStats.count++
    if (queryStats.verbose) console.log('  SQL>', query.slice(0, 120))
  }
}

const url = process.env.DATABASE_URL
const pglite = url ? undefined : new PGlite('./.pglite')

// ponytail: 未配置 DATABASE_URL 时用 PGlite（WASM 版 PostgreSQL），方便没装 Docker 的同学；生产只用 postgres-js
export const db = url
  ? drizzlePg(postgres(url), { schema, logger })
  : (drizzlePglite(pglite!, { schema, logger }) as unknown as ReturnType<typeof drizzlePg<typeof schema>>)

export type DB = typeof db
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0]

export async function closeDb() {
  if (pglite) await pglite.close()
  else await (db.$client as postgres.Sql).end()
}
