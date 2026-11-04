import { relations } from 'drizzle-orm'
import { date, index, integer, pgEnum, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

const createdAt = timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
const deletedAt = timestamp('deleted_at', { withTimezone: true })

export const roleEnum = pgEnum('role', ['owner', 'member'])
export const taskStatusEnum = pgEnum('task_status', ['todo', 'doing', 'done'])
export const priorityEnum = pgEnum('priority', ['low', 'medium', 'high'])
export const taskSourceEnum = pgEnum('task_source', ['manual', 'ai'])

/** 租户：一个团队一个工作区，所有业务数据都挂在 workspace_id 下 */
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  createdAt
})

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    email: text('email').notNull().unique(),
    name: text('name').notNull(),
    role: roleEnum('role').default('member').notNull(),
    passwordHash: text('password_hash').notNull(),
    createdAt,
    deletedAt
  },
  (t) => [index('users_workspace_idx').on(t.workspaceId)]
)

export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id),
    title: text('title').notNull(),
    description: text('description'),
    status: taskStatusEnum('status').default('todo').notNull(),
    priority: priorityEnum('priority').default('medium').notNull(),
    assigneeId: uuid('assignee_id').references(() => users.id),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => users.id),
    dueDate: date('due_date'),
    source: taskSourceEnum('source').default('manual').notNull(),
    version: integer('version').default(1).notNull(),
    createdAt,
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
    deletedAt
  },
  (t) => [index('tasks_workspace_idx').on(t.workspaceId)]
)

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignee: one(users, { fields: [tasks.assigneeId], references: [users.id] })
}))

export type Role = (typeof roleEnum.enumValues)[number]
export type Task = typeof tasks.$inferSelect
