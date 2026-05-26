import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 开发时将 /api/* 代理到 Express 后端，避免浏览器跨域 & 前端无需硬编码 8080
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
