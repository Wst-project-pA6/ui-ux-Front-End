import { ApiError } from './errors'
import { tokenStorage } from './tokenStorage'

/**
 * Base URL of the WST backend API.
 * Development: leave unset so requests go through the Vite dev-server proxy
 * (`/api` → http://localhost:3000). Production: set VITE_API_BASE_URL to the
 * deployed backend, e.g. https://wst.example.edu/api/v1
 */
const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ?? '/api/v1'
).replace(/\/+$/, '')

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface RequestOptions {
  method?: HttpMethod
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  /** Skip the Authorization header (public endpoints). */
  anonymous?: boolean
  /**
   * Internal: disables the 401-refresh-and-retry flow. Must be true for
   * /auth/login, /auth/refresh and /auth/logout so a failing auth call can
   * never trigger a recursive refresh attempt.
   */
  skipAuthRefresh?: boolean
  /**
   * Optional Idempotency-Key (8–128 chars). Used by part-issue, reversal
   * and stock-adjustment POSTs so a network retry never duplicates work.
   * Generate a fresh UUID per distinct user action.
   */
  idempotencyKey?: string
  /** Set for multipart/form-data uploads — body must be a FormData instance. */
  multipart?: boolean
}

export function isBackendConfigured(): boolean {
  return API_BASE_URL.length > 0
}

export function getApiBaseUrl(): string {
  return API_BASE_URL
}

let refreshInFlight: Promise<{ accessToken: string; refreshToken: string }> | null =
  null

async function performRefresh(): Promise<{
  accessToken: string
  refreshToken: string
}> {
  const startEpoch = tokenStorage.getEpoch()
  const refreshToken = tokenStorage.getRefreshToken()
  if (!refreshToken) {
    throw new ApiError({
      message: 'No refresh token available',
      code: 'UNAUTHENTICATED',
      status: 401,
    })
  }
  const pair = await request<{ accessToken: string; refreshToken: string }>(
    '/auth/refresh',
    {
      method: 'POST',
      body: { refreshToken },
      anonymous: true,
      skipAuthRefresh: true,
    },
  )
  // Logout during refresh must not restore authentication: discard late results.
  if (tokenStorage.getEpoch() !== startEpoch) {
    throw new ApiError({
      message: 'Session ended during refresh.',
      code: 'UNAUTHENTICATED',
      status: 401,
    })
  }
  // Store the ROTATED refresh token immediately — the old one is single-use.
  tokenStorage.setAccessToken(pair.accessToken)
  tokenStorage.setRefreshToken(pair.refreshToken)
  return pair
}

/** Ensures only one refresh request is ever in flight at a time. */
export function refreshOnce(): Promise<{
  accessToken: string
  refreshToken: string
}> {
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null
    })
  }
  return refreshInFlight
}

function buildUrl(
  path: string,
  query?: RequestOptions['query'],
): string {
  const params = new URLSearchParams()
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value))
      }
    }
  }
  const suffix = params.toString()
  return `${API_BASE_URL}${path}${suffix ? `?${suffix}` : ''}`
}

async function toApiError(response: Response): Promise<ApiError> {
  const retryAfter = response.headers.get('Retry-After')
  const retryAfterSeconds = retryAfter ? Number(retryAfter) || undefined : undefined
  try {
    const parsed = (await response.json()) as unknown
    if (
      parsed &&
      typeof parsed === 'object' &&
      'code' in parsed &&
      'message' in parsed
    ) {
      return ApiError.fromBody(
        response.status,
        parsed as { code: string; message: string; requestId?: string; details?: never; conflicts?: never },
        retryAfterSeconds,
      )
    }
  } catch {
    /* non-JSON error body */
  }
  return new ApiError({
    message: `Request failed with status ${response.status}`,
    code: response.status === 401 ? 'UNAUTHENTICATED' : 'UNKNOWN_ERROR',
    status: response.status,
    retryAfterSeconds,
  })
}

/** Generates an Idempotency-Key (UUID v4). One key per user action. */
export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `idem-${Date.now()}-${Math.random().toString(36).slice(2, 18)}`
}

/**
 * Core typed request function. Attaches the bearer access token (unless
 * `anonymous`), serializes the JSON body, and parses the JSON response
 * (handling 204 No Content).
 *
 * On a 401 from a non-anonymous, non-skipAuthRefresh request, attempts a
 * single shared token refresh and retries the original request exactly once.
 */
export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    query,
    body,
    signal,
    headers = {},
    anonymous = false,
    skipAuthRefresh = false,
  } = options

  const doFetch = async (retryWithFreshToken: boolean): Promise<T> => {
    const requestHeaders: Record<string, string> = {
      Accept: 'application/json',
      ...headers,
    }
    if (options.idempotencyKey) {
      requestHeaders['Idempotency-Key'] = options.idempotencyKey
    }
    if (!anonymous) {
      const token = tokenStorage.getAccessToken()
      if (token) requestHeaders.Authorization = `Bearer ${token}`
      const lang =
        typeof document !== 'undefined'
          ? document.documentElement.lang
          : undefined
      if (lang === 'ar' || lang === 'en') {
        requestHeaders['Accept-Language'] = lang
      }
    }
    let payload: BodyInit | undefined
    if (body !== undefined) {
      if (options.multipart && body instanceof FormData) {
        // multipart/form-data: never set Content-Type manually — the
        // browser adds the boundary. Contract requires this for uploads.
        payload = body
      } else {
        requestHeaders['Content-Type'] = 'application/json'
        payload = JSON.stringify(body)
      }
    }

    let response: Response
    try {
      response = await fetch(buildUrl(path, query), {
        method,
        headers: requestHeaders,
        body: payload,
        signal,
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') throw err
      throw new ApiError({
        message:
          'Cannot reach the server. Check your connection or backend availability.',
        code: 'NETWORK_ERROR',
        status: 0,
      })
    }

    if (response.status === 401 && !anonymous && !skipAuthRefresh && !retryWithFreshToken) {
      try {
        await refreshOnce()
        return doFetch(true)
      } catch {
        tokenStorage.clear()
        throw new ApiError({
          message: 'Your session has expired. Please sign in again.',
          code: 'UNAUTHENTICATED',
          status: 401,
        })
      }
    }

    if (!response.ok) {
      const apiError = await toApiError(response)
      // Forced password change: route the user to the change-password flow.
      if (response.status === 403 && apiError.code === 'PASSWORD_CHANGE_REQUIRED') {
        try {
          window.dispatchEvent(new CustomEvent('wst:password-required'))
        } catch {
          /* non-browser runtime */
        }
      }
      throw apiError
    }
    if (response.status === 204) return undefined as T
    const text = await response.text()
    if (!text) return undefined as T
    return JSON.parse(text) as T
  }

  return doFetch(false)
}

/**
 * Fetches an absolute download URL (from POST /attachments/.../download-authorizations)
 * with the Bearer token and returns a blob object URL for <img> / download links.
 * Callers must revoke the URL when done (URL.revokeObjectURL).
 * The signed URL only works for the requesting user and only briefly.
 */
export async function fetchAuthenticatedBlob(absoluteUrl: string): Promise<string> {
  const token = tokenStorage.getAccessToken()
  let response: Response
  try {
    response = await fetch(absoluteUrl, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    })
  } catch {
    throw new ApiError({
      message: 'Cannot reach the server. Check your connection or backend availability.',
      code: 'NETWORK_ERROR',
      status: 0,
    })
  }
  if (!response.ok) throw await toApiError(response)
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}
