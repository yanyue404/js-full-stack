import { app } from './app.js'
import { ensureSchema } from './db.js'

const port = Number(process.env.PORT ?? 8080)

await ensureSchema()
app.listen(port, () => console.log(`API listening on :${port}`))
