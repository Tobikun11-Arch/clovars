import { useCallback, useEffect, useState } from 'react'

function readPath(): string {
  const hash = window.location.hash.replace(/^#/, '')
  if (!hash) return '/'
  return hash.startsWith('/') ? hash : `/${hash}`
}

/**
 * Minimal hash router. Using the hash keeps the Electron app working when it is
 * loaded from disk (`file://`) in production, where the history API is awkward.
 */
export function useHashRoute(): {
  path: string
  navigate: (next: string) => void
} {
  const [path, setPath] = useState<string>(() => readPath())

  useEffect(() => {
    function onHashChange(): void {
      setPath(readPath())
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = useCallback((next: string): void => {
    const normalized = next.startsWith('/') ? next : `/${next}`
    if (readPath() === normalized) {
      setPath(normalized)
      return
    }
    window.location.hash = normalized
  }, [])

  return { path, navigate }
}
