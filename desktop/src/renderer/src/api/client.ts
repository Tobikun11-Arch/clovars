const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:5000'

console.info('Clovars API_URL =', API_URL)

let csrfToken: string | null = null

export async function ensureCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken

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

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const unsafe = method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE'

  const headers = new Headers(options.headers)
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  if (unsafe) {
    const token = await ensureCsrfToken()
    headers.set('x-csrf-token', token)
  }

  console.log('apiRequest', method, path, 'body=', options.body)

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    method,
    headers,
    credentials: 'include'
  })

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
