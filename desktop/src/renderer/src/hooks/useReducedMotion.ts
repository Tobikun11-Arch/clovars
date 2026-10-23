import { useEffect, useState } from 'react'
import { PREFERENCE_CHANGE_EVENT, isReduceMotionEnabled } from '../utils/preferences'

function readReducedMotion(): boolean {
  if (typeof window === 'undefined') return false

  return (
    isReduceMotionEnabled() ||
    document.documentElement.dataset.reduceMotion === 'true' ||
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(readReducedMotion)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    function sync(): void {
      setReducedMotion(readReducedMotion())
    }

    mediaQuery.addEventListener('change', sync)
    window.addEventListener(PREFERENCE_CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)

    return () => {
      mediaQuery.removeEventListener('change', sync)
      window.removeEventListener(PREFERENCE_CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  return reducedMotion
}
