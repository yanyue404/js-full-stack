import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发时由 Vite 代理 /api，生产时由 Nginx 代理，前端代码无需区分环境
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:8080' } }
})
