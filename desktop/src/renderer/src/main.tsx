import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import {
  applyReduceMotionPreference,
  isReduceMotionEnabled,
  syncMiniTimerPreference
} from './utils/preferences'

applyReduceMotionPreference(isReduceMotionEnabled())
syncMiniTimerPreference()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
