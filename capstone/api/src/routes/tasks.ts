import { Router } from 'express'
import { z } from 'zod'
import { currentUser, requireAuth } from '../lib/auth.js'
import { parse } from '../lib/errors.js'
import { aiLimiter } from '../middleware/rateLimit.js'
import { taskService } from '../services/taskService.js'
import { breakdownGoal } from '../services/aiService.js'

const taskFields = {
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(2000).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  status: z.enum(['todo', 'doing', 'done']).optional(),
  assigneeId: z.string().uuid().nullable().optional(),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional()
}
const createInput = z.object(taskFields)
const batchInput = z.object({ tasks: z.array(createInput).min(1).max(20), source: z.enum(['manual', 'ai']).default('manual') })
const patchInput = z.object(taskFields).partial().extend({ version: z.number().int().positive() })
const idParam = z.string().uuid()

export const tasksRouter = Router()
tasksRouter.use(['/api/tasks', '/api/ai'], requireAuth)

tasksRouter.get('/api/tasks', async (req, res) => {
  res.json(await taskService.list(currentUser(req).workspaceId))
})

tasksRouter.post('/api/tasks', async (req, res) => {
  res.status(201).json(await taskService.create(currentUser(req), parse(createInput, req.body)))
})

tasksRouter.post('/api/tasks/batch', async (req, res) => {
  const input = parse(batchInput, req.body)
  res.status(201).json({ created: await taskService.createMany(currentUser(req), input.tasks, input.source) })
})

tasksRouter.patch('/api/tasks/:id', async (req, res) => {
  const { version, ...patch } = parse(patchInput, req.body)
  res.json(await taskService.update(currentUser(req), parse(idParam, req.params.id), patch, version))
})

tasksRouter.delete('/api/tasks/:id', async (req, res) => {
  await taskService.remove(currentUser(req), parse(idParam, req.params.id))
  res.status(204).end()
})

/** AI 拆解只返回建议，由用户确认后再调用 /tasks/batch 落库 */
tasksRouter.post('/api/ai/breakdown', aiLimiter, async (req, res) => {
  const { goal } = parse(z.object({ goal: z.string().trim().min(2).max(200) }), req.body)
  res.json(await breakdownGoal(goal))
})
