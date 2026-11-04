import { relations } from 'drizzle-orm'
import { date, index, integer, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core'

const auditFields = {
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true })
}

export const planEnum = pgEnum('plan', ['free', 'pro', 'enterprise'])
export const roleEnum = pgEnum('role', ['owner', 'admin', 'member'])
export const projectStatusEnum = pgEnum('project_status', ['active', 'archived'])
export const taskStatusEnum = pgEnum('task_status', ['todo', 'in_progress', 'done'])

export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: planEnum('plan').default('free').notNull(),
  ...auditFields
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: roleEnum('role').default('member').notNull(),
    passwordHash: text('password_hash').notNull(),
    ...auditFields
  },
  (t) => [uniqueIndex('users_tenant_email_uq').on(t.tenantId, t.email)]
)

export const projects = pgTable(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id),
    name: text('name').notNull(),
    description: text('description'),
    status: projectStatusEnum('status').default('active').notNull(),
    ...auditFields
  },
  (t) => [index('projects_tenant_idx').on(t.tenantId)]
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id')
      .notNull()
      .references(() => projects.id),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusEnum('status').default('todo').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id),
    dueDate: date('due_date'),
    version: integer('version').default(1).notNull(),
    ...auditFields
  },
  (t) => [index('tasks_project_idx').on(t.projectId)]
)

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  projects: many(projects)
}))

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] })
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  tenant: one(tenants, { fields: [projects.tenantId], references: [tenants.id] }),
  tasks: many(tasks)
}))

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] })
}))

export type TaskStatus = (typeof taskStatusEnum.enumValues)[number]
