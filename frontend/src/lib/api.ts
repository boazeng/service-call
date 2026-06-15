// Tiny fetch wrapper. Attaches the JWT, parses JSON, normalizes errors.
const TOKEN_KEY = 'sc_token'

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type Options = {
  method?: string
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
}

export async function api<T = unknown>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, query } = opts
  let url = path
  if (query) {
    const qs = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
    }
    const s = qs.toString()
    if (s) url += `?${s}`
  }

  const headers: Record<string, string> = {}
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  const resp = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (resp.status === 204) return undefined as T
  const text = await resp.text()
  const data = text ? JSON.parse(text) : undefined
  if (!resp.ok) {
    const detail = (data && (data.detail || data.message)) || resp.statusText
    throw new ApiError(resp.status, typeof detail === 'string' ? detail : 'שגיאת שרת')
  }
  return data as T
}
