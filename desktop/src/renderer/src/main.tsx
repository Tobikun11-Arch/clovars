import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'

// Apply the device-level motion preference before the first paint.
if (localStorage.getItem('clovars.reduceMotion') === 'true') {
  document.documentElement.dataset.reduceMotion = 'true'
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
