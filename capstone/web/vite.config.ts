import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  // 开发时代理到本地 API，生产由 Nginx 同源代理
  server: { port: 5173, proxy: { '/api': 'http://localhost:8080' } }
})
