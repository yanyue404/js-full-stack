import express, { type NextFunction, type Request, type Response } from 'express'
import cors from 'cors'
import { desc, eq, sql } from 'drizzle-orm'
import { z } from 'zod'
import { db, users } from './db.js'

const userInput = z.object({
  name: z.string().trim().min(1).max(50),
  email: z.string().trim().email()
})

export const app = express()
app.use(cors())
app.use(express.json())

const api = express.Router()

api.get('/health', async (_req, res) => {
  try {
    await db.execute(sql`select 1`)
    res.json({ status: 'ok', db: 'up', env: process.env.NODE_ENV ?? 'development' })
  } catch {
    res.status(503).json({ status: 'error', db: 'down' })
  }
})

api.get('/users', async (_req, res) => {
  res.json(await db.select().from(users).orderBy(desc(users.createdAt)).limit(100))
})

api.get('/users/:id', async (req, res) => {
  const id = z.string().uuid().safeParse(req.params.id)
  if (!id.success) return void res.status(400).json({ error: 'Invalid id' })
  const [user] = await db.select().from(users).where(eq(users.id, id.data))
  if (!user) return void res.status(404).json({ error: 'User not found' })
  res.json(user)
})

api.post('/users', async (req, res) => {
  const parsed = userInput.safeParse(req.body)
  if (!parsed.success) return void res.status(400).json({ error: 'Validation failed', detail: parsed.error.flatten() })
  const [user] = await db
    .insert(users)
    .values(parsed.data)
    .onConflictDoNothing({ target: users.email })
    .returning()
  if (!user) return void res.status(409).json({ error: 'Email already exists' })
  res.status(201).json(user)
})

app.use('/api', api)

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal Server Error' })
})
