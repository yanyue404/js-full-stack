import { and, eq, isNull } from 'drizzle-orm'
import { db } from '../db/index.js'
import { tenants, users } from '../db/schema.js'

export const tenantService = {
  getBySlug(slug: string) {
    return db.query.tenants.findFirst({
      where: and(eq(tenants.slug, slug), isNull(tenants.deletedAt))
    })
  },

  /** 多租户隔离：所有查询都必须带 tenant_id */
  listUsers(tenantId: string) {
    return db
      .select({ id: users.id, email: users.email, name: users.name, role: users.role })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), isNull(users.deletedAt)))
  }
}
