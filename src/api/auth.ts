// Authentication endpoints (contract tag: Authentication).
// POST /auth/login + /auth/refresh are public + rate-limited per IP/account.
// POST /auth/logout + GET /auth/me + POST /auth/change-password need a token.
// NOTE: the contract has NO public sign-up and NO forgot-password endpoint:
// user creation is POST /users (permission users.manage) and password change
// is authenticated-only. The UI reflects that (see SignUp / ForgotPassword).
import { api, tokenStore } from './http'
import type { CurrentUser, TokenPair } from './types'

export interface LoginRequest {
  email: string
  password: string
}

export async function login(req: LoginRequest): Promise<TokenPair> {
  const pair = await api.post<TokenPair>('/auth/login', req, { public: true })
  tokenStore.save(pair.accessToken, pair.refreshToken)
  return pair
}

export async function refreshToken(): Promise<TokenPair> {
  const refreshTokenValue = tokenStore.getRefresh()
  if (!refreshTokenValue) throw new Error('No refresh token stored')
  const pair = await api.post<TokenPair>(
    '/auth/refresh',
    { refreshToken: refreshTokenValue },
    { public: true, noAutoRefresh: true },
  )
  tokenStore.save(pair.accessToken, pair.refreshToken)
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
  return !!tokenStore.getAccess()
}
