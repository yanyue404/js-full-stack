import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { initSentry, Sentry } from './lib/sentry'
import './index.css'

initSentry()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Sentry.ErrorBoundary fallback={<p role="alert">页面出错了，错误已上报。</p>}>
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
)
