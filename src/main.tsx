import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/foundation.css'
import './styles.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
