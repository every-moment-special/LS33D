import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@/styles/index.scss'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
