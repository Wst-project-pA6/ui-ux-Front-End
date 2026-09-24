// Low-level fetch wrapper implementing the contract's cross-cutting rules:
// - `Authorization: Bearer <accessToken>` (omitted only for public ops)
// - `Accept-Language: en|ar` on every request (contract § Localization)
// - `Idempotency-Key` on stock-changing / payment POSTs (replay-safe)
// - Single-flight 401 -> refresh -> retry once; 429 surfaces Retry-After
// - 404 masks out-of-scope rows (treated as NotFound, never disclosed)
// - Money stays a decimal string; unknown request props are stripped by callers.
import { getApiBaseUrl, CONTRACT } from './config'
import type { ApiErrorBody, Locale, TokenPair } from './types'

export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  details?: ApiErrorBody['details']
  retryAfter?: number

  constructor(status: number, body: ApiErrorBody | string, retryAfter?: number) {
    const message = typeof body === 'string' ? body : body.message
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = typeof body === 'string' ? 'UNKNOWN' : body.code
    this.requestId = typeof body === 'string' ? undefined : body.requestId
    this.details = typeof body === 'string' ? undefined : body.details
    this.retryAfter = retryAfter
  }

  isAuth(): boolean {
    return this.status === 401
  }
  isForbidden(): boolean {
    return this.status === 403
  }
  isNotFound(): boolean {
    return this.status === 404
  }
  isConflict(): boolean {
    return this.status === 409
  }
  isValidation(): boolean {
    return this.status === 422
  }
  isRateLimited(): boolean {
    return this.status === 429
  }
}

const REFRESH_KEY = 'wst-refresh-token'
const DEMO_KEY = 'wst-demo-session'

/** Access token lives in memory only — never persisted. */
let memoryAccessToken: string | null = null

export const tokenStore = {
  getAccess(): string | null {
    return memoryAccessToken
  },
  getRefresh(): string | null {
    try { return sessionStorage.getItem(REFRESH_KEY) } catch { return null }
  },
  save(access: string, refresh: string): void {
    memoryAccessToken = access
    try { sessionStorage.setItem(REFRESH_KEY, refresh) } catch { /* ignore */ }
  },
  clear(): void {
    memoryAccessToken = null
    try {
      sessionStorage.removeItem(REFRESH_KEY)
      sessionStorage.removeItem(DEMO_KEY)
    } catch { /* noop */ }
  },
  /** Offline demo marker (session-scoped, like the refresh token). */
  setDemo(email: string): void {
    try { sessionStorage.setItem(DEMO_KEY, email) } catch { /* noop */ }
  },
  getDemo(): string | null {
    try { return sessionStorage.getItem(DEMO_KEY) } catch { return null }
  },
}

/** Auth lifecycle events the UI subscribes to (singleflight refresh and
 *  forced-password flows are coordinated here, not in components). */
type AuthEvent = 'session-expired' | 'password-change-required'
const authListeners = new Set<(event: AuthEvent) => void>()

export function onAuthEvent(listener: (event: AuthEvent) => void): () => void {
  authListeners.add(listener)
  return () => { authListeners.delete(listener) }
}

function emitAuthEvent(event: AuthEvent): void {
  for (const listener of [...authListeners]) {
    try { listener(event) } catch { /* noop */ }
  }
}

export function getLocale(): Locale {
  try {
    const v = localStorage.getItem('wst-lang')
    if (v === 'ar' || v === 'en') return v
  } catch { /* noop */ }
  return document.documentElement.lang === 'ar' ? 'ar' : 'en'
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export function buildQuery(query?: Record<string, string | number | undefined>): string {
  if (!query) return ''
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === '') continue
    params.set(k, String(v))
  }
  const s = params.toString()
  return s ? `?${s}` : ''
}

interface RequestOptions {
  method?: string
  body?: unknown
  query?: Record<string, string | number | undefined>
  /** Set for the 7 idempotent POSTs (issuePart, reservePart, ...). */
  idempotencyKey?: string
  /** Public endpoints (login/refresh/health) skip the bearer token. */
  public?: boolean
  /** Skip the single auto-refresh retry (used by the refresh call itself). */
  noAutoRefresh?: boolean
}

let refreshInFlight: Promise<TokenPair | null> | null = null

/**
 * Single shared refresh operation. Concurrent callers (StrictMode
 * double-mounts, simultaneous 401s, restore + retry races) all await the
 * SAME promise and receive the SAME new pair — the old refresh token is
 * therefore sent exactly once. Sending it twice would make the server
 * treat the session as stolen and end it.
 */
export function refreshAccessToken(): Promise<TokenPair | null> {
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    const refreshToken = tokenStore.getRefresh()
    if (!refreshToken) return null
    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', [CONTRACT.languageHeader]: getLocale() },
        body: JSON.stringify({ refreshToken }),
      })
      if (!res.ok) {
        // Only clear when nothing else rotated meanwhile (a logout or a
        // newer refresh may have already replaced the stored token).
        if (tokenStore.getRefresh() === refreshToken) tokenStore.clear()
        return null
      }
      // Same shape as login (accessToken, refreshToken, tokenType,
      // expiresIn, mustChangePassword).
      const pair = (await res.json()) as TokenPair
      // Discard late responses: if the stored token changed while this
      // request was in flight (logout cleared it, or a newer rotation
      // replaced it), saving here would resurrect a dead session.
      if (tokenStore.getRefresh() !== refreshToken) return null
      tokenStore.save(pair.accessToken, pair.refreshToken)
      return pair
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

async function tryRefresh(): Promise<string | null> {
  const pair = await refreshAccessToken()
  return pair ? pair.accessToken : null
}

export async function apiRequest<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = `${getApiBaseUrl()}${path}${buildQuery(opts.query)}`
  const headers: Record<string, string> = {
    [CONTRACT.languageHeader]: getLocale(),
  }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (opts.idempotencyKey) headers[CONTRACT.idempotencyHeader] = opts.idempotencyKey

  const token = !opts.public ? tokenStore.getAccess() : null
  if (token) headers['Authorization'] = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    })
  } catch (err) {
    throw new ApiError(0, err instanceof Error ? `Network error: ${err.message}` : 'Network error')
  }

  // Single-flight token rotation: 401 -> refresh -> retry once.
  // If the refresh fails (or there is no refresh token), the session is
  // over: clear everything and tell the UI exactly once.
  if (res.status === 401 && !opts.public && !opts.noAutoRefresh) {
    const fresh = await tryRefresh()
    if (fresh) {
      return apiRequest<T>(path, { ...opts, noAutoRefresh: true })
    }
    tokenStore.clear()
    emitAuthEvent('session-expired')
  }

  if (res.status === 204) return undefined as T
  const retryAfter = res.headers.get('Retry-After')
  const text = await res.text()
  // Error pages from gateways/proxies may not be JSON — never let the
  // parser crash the error path; fall back to the raw text as the message.
  let data: (T & ApiErrorBody) | undefined
  try {
    data = text ? (JSON.parse(text) as T & ApiErrorBody) : undefined
  } catch {
    data = undefined
  }

  if (!res.ok) {
    const body: ApiErrorBody | string =
      data && typeof data === 'object' && 'code' in (data as Record<string, unknown>)
        ? (data as unknown as ApiErrorBody)
        : (text || `Request failed with status ${res.status}`)
    const apiErr = new ApiError(
      res.status,
      body,
      retryAfter ? Number(retryAfter) : undefined,
    )
    // The backend gates every other endpoint behind a password change for
    // new/reset accounts. Route the user to the change-password screen.
    if (res.status === 403 && apiErr.code === 'PASSWORD_CHANGE_REQUIRED') {
      emitAuthEvent('password-change-required')
    }
    throw apiErr
  }
  return data as T
}

export const api = {
  get: <T>(path: string, query?: RequestOptions['query'], opts?: Omit<RequestOptions, 'method' | 'query'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET', query }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
}
