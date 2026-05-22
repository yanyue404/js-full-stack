import { createApp } from './app.js'
import { config } from './config.js'
import { seedIfEmpty } from './seed.js'

const app = createApp()

await seedIfEmpty()

app.listen(config.port, () => {
  console.log(`User API listening on http://localhost:${config.port}`)
  console.log(`Health: http://localhost:${config.port}/api/health`)
})
