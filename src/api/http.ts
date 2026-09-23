// Low-level fetch wrapper implementing the contract's cross-cutting rules:
// - `Authorization: Bearer <accessToken>` (omitted only for public ops)
// - `Accept-Language: en|ar` on every request (contract § Localization)
// - `Idempotency-Key` on stock-changing / payment POSTs (replay-safe)
// - Single-flight 401 -> refresh -> retry once; 429 surfaces Retry-After
// - 404 masks out-of-scope rows (treated as NotFound, never disclosed)
// - Money stays a decimal string; unknown request props are stripped by callers.
import { getApiBaseUrl, CONTRACT } from './config'
import type { ApiErrorBody, Locale } from './types'

export class ApiError extends Error {
  status: number
  code: string
  requestId?: string
  details?: ApiErrorBody['details']
  /** Present on 409 SCHEDULE_CONFLICT — the explainable conflict list. */
  conflicts?: ApiErrorBody['conflicts']
  retryAfter?: number

  constructor(status: number, body: ApiErrorBody | string, retryAfter?: number) {
    const message = typeof body === 'string' ? body : body.message
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = typeof body === 'string' ? 'UNKNOWN' : body.code
    this.requestId = typeof body === 'string' ? undefined : body.requestId
    this.details = typeof body === 'string' ? undefined : body.details
    this.conflicts = typeof body === 'string' ? undefined : body.conflicts
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

const ACCESS_KEY = 'wst-access-token'
const REFRESH_KEY = 'wst-refresh-token'

// Token storage mirrors the backend's documented strategy
// (backend/docs/SECURITY.md, also used by its own frontend):
// - access token lives only in memory (never persisted)
// - refresh token lives in sessionStorage (survives reload within the tab
//   session, never across browser restarts, never in localStorage)
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
    try {
      sessionStorage.setItem(REFRESH_KEY, refresh)
    } catch { /* private-mode: session-only */ }
  },
  clear(): void {
    memoryAccessToken = null
    try {
      sessionStorage.removeItem(ACCESS_KEY)
      sessionStorage.removeItem(REFRESH_KEY)
      // Legacy cleanup: tokens were briefly kept in localStorage.
      localStorage.removeItem(ACCESS_KEY)
      localStorage.removeItem(REFRESH_KEY)
    } catch { /* noop */ }
  },
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

export function buildQuery(query?: Record<string, string | number | boolean | undefined>): string {
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
  query?: Record<string, string | number | boolean | undefined>
  /** Set for the 7 idempotent POSTs (issuePart, reservePart, ...). */
  idempotencyKey?: string
  /** Public endpoints (login/refresh/health) skip the bearer token. */
  public?: boolean
  /** Skip the single auto-refresh retry (used by the refresh call itself). */
  noAutoRefresh?: boolean
}

let refreshInFlight: Promise<string | null> | null = null

async function tryRefresh(): Promise<string | null> {
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
        tokenStore.clear()
        return null
      }
      const pair = (await res.json()) as { accessToken: string; refreshToken: string }
      tokenStore.save(pair.accessToken, pair.refreshToken)
      return pair.accessToken
    } catch {
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
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
  if (res.status === 401 && !opts.public && !opts.noAutoRefresh) {
    const fresh = await tryRefresh()
    if (fresh) {
      return apiRequest<T>(path, { ...opts, noAutoRefresh: true })
    }
  }

  if (res.status === 204) return undefined as T
  const retryAfter = res.headers.get('Retry-After')
  const text = await res.text()
  // A proxy or crashed backend may return non-JSON (HTML); never let the
  // parser itself throw — fall back to the raw text as the message.
  let data: unknown = undefined
  if (text) {
    try {
      data = JSON.parse(text) as T & ApiErrorBody
    } catch {
      data = undefined
    }
  }

  if (!res.ok) {
    const body: ApiErrorBody | string =
      data && typeof data === 'object' && 'code' in (data as Record<string, unknown>)
        ? (data as unknown as ApiErrorBody)
        : (text || `Request failed with status ${res.status}`)
    throw new ApiError(
      res.status,
      body,
      retryAfter ? Number(retryAfter) : undefined,
    )
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
