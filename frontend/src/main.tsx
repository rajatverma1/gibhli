import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './components/ui/index.css'
import './components/ui/app.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
