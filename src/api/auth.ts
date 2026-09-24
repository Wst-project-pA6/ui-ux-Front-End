// Authentication endpoints (Final v1 contract).
// POST /auth/login + /auth/refresh are public + rate-limited per IP/account.
// POST /auth/logout + GET /auth/me + POST /auth/change-password need a token.
// NOTE: the contract has NO public sign-up and NO forgot-password endpoint:
// user creation is POST /users (permission users.manage) and password change
// is authenticated-only. There is no registration UI.
import { api, tokenStore, refreshAccessToken, ApiError } from './http'
import type { CurrentUser, TokenPair } from './types'

export interface LoginRequest {
  email: string
  password: string
}

export async function login(req: LoginRequest): Promise<TokenPair> {
  // The hosted backend cold-starts: a login attempt may hit a gateway
  // 502/503/504 or a dropped connection. Safe to retry (each attempt mints
  // its own session; orphans expire server-side). Never retry /refresh —
  // refresh tokens are single-use and a lost response must end the session.
  const delays = [2000, 5000]
  let lastError: unknown = null
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      const pair = await api.post<TokenPair>('/auth/login', req, { public: true })
      tokenStore.save(pair.accessToken, pair.refreshToken)
      return pair
    } catch (err) {
      lastError = err
      const retryable =
        err instanceof ApiError &&
        (err.status === 0 || err.status === 502 || err.status === 503 || err.status === 504)
      if (!retryable || attempt === delays.length) throw err
      await new Promise((r) => setTimeout(r, delays[attempt]))
    }
  }
  throw lastError
}

export async function refreshToken(): Promise<TokenPair> {
  // Goes through the shared single-flight refresh: concurrent callers
  // share one server call, so the single-use token is never sent twice.
  const pair = await refreshAccessToken()
  if (!pair) throw new Error('No refresh token stored')
  return pair
}

export async function logout(): Promise<void> {
  const refreshTokenValue = tokenStore.getRefresh()
  try {
    if (refreshTokenValue) await api.post<void>('/auth/logout', { refreshToken: refreshTokenValue })
  } finally {
    // Always clear local tokens — revocation is best-effort offline.
    tokenStore.clear()
    try {
      localStorage.removeItem('wst-role')
      localStorage.removeItem('wst-user-name')
    } catch { /* noop */ }
  }
}

export function getCurrentUser(): Promise<CurrentUser> {
  return api.get<CurrentUser>('/auth/me')
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return api.post<void>('/auth/change-password', { currentPassword, newPassword })
}

export function isAuthenticated(): boolean {
  return !!tokenStore.getRefresh() || !!tokenStore.getDemo()
}
