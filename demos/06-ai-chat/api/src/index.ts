import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import chatRouter from './routes/chat.js'
import recipeRouter from './routes/recipe.js'

const app = express()
const port = Number(process.env.PORT ?? 8080)

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use('/api', chatRouter)
app.use('/api', recipeRouter)

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' })
})

app.listen(port, () => {
  console.log(`AI Chat API listening on http://localhost:${port}`)
})
