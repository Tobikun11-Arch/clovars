const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000'

console.info('Clovars API_URL =', API_URL)

let csrfToken: string | null = null
let refreshPromise: Promise<boolean> | null = null

async function fetchCsrfToken(force = false): Promise<string> {
  if (!force && csrfToken) return csrfToken

  const response = await fetch(`${API_URL}/api/auth/csrf`, {
    method: 'GET',
    credentials: 'include'
  })

  if (!response.ok) {
    throw new Error(`Failed to obtain CSRF token (${response.status})`)
  }

  const data = (await response.json()) as { csrfToken: string }
  csrfToken = data.csrfToken
  return csrfToken
}

export async function ensureCsrfToken(): Promise<string> {
  return fetchCsrfToken(false)
}

// Never try to refresh auth endpoints themselves, to avoid loops.
function canAttemptRefresh(path: string): boolean {
  return !path.startsWith('/api/auth/')
}

// Rotate the refresh token once and share the attempt with concurrent callers.
async function refreshSession(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async (): Promise<boolean> => {
    try {
      const token = await fetchCsrfToken(true)
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'x-csrf-token': token }
      })

      return response.ok
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const unsafe = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (unsafe) {
    headers.set('x-csrf-token', await ensureCsrfToken())
  }

  const send = (): Promise<Response> =>
    fetch(`${API_URL}${path}`, {
      ...options,
      method,
      headers,
      credentials: 'include'
    })

  console.log('apiRequest', method, path, 'body=', options.body)

  let response = await send()

  // Access tokens live for 15 minutes; renew silently and replay the request once.
  if (response.status === 401 && canAttemptRefresh(path)) {
    const refreshed = await refreshSession()

    if (refreshed) {
      if (unsafe) {
        headers.set('x-csrf-token', await fetchCsrfToken(true))
      }
      response = await send()
    }
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const errorBody = (await response.json()) as { message?: string }
      if (errorBody.message) message = errorBody.message
    } catch {
      // ignore parse errors
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}
