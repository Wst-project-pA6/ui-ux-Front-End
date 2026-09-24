// Auth provider bound to the Final v1 contract:
// POST /auth/login, POST /auth/refresh, POST /auth/logout,
// GET /auth/me, POST /auth/change-password.
// - accessToken: memory only. refreshToken: sessionStorage (per-tab sessions).
// - Falls back to the local demo directory ONLY when the backend is
//   unreachable, so the UI stays usable offline.
// - UI role is derived from backend RoleCodes; permissions from /auth/me
//   drive every admin gate (never role-name assumptions, except demo mode
//   where the backend cannot answer).
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getCurrentUser, login as apiLogin, logout as apiLogout, refreshToken as apiRefresh, isAuthenticated } from '../api/auth'
import { ApiError, onAuthEvent, tokenStore } from '../api/http'
import { roleCodeToUiRole } from '../api/mapping'
import { authenticate as demoAuthenticate, findUserByEmail } from '../utils/demoAuth'
import { useRole } from './RoleContext'
import type { CurrentUser } from '../api/types'
import type { Role } from './RoleContext'

/** Demo-mode permissions by UI role (live mode always uses /auth/me). */
const DEMO_PERMISSIONS: Record<Role, string[]> = {
  admin: ['users.read', 'users.manage', 'roles.assign', 'scopes.manage'],
  manager: [],
  advisor: [],
  technician: [],
  storekeeper: [],
  supervisor: [],
  mentor: [],
  student: [],
  finance: [],
}

interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean
  /** Live when tokens came from the API, demo when offline-fallback was used. */
  mode: 'live' | 'demo' | 'none'
  /** First organization scope of the user — required by create payloads. */
  scopeId: string
  error: string
  /** Set when the backend gates calls behind a password change. */
  forcePasswordChange: boolean
  clearForcePasswordChange: () => void
  hasPermission: (code: string) => boolean
  signIn: (email: string, password: string) => Promise<{ mustChangePassword: boolean; role: Role }>
  signOut: (messageKey?: string) => Promise<void>
  /** Translation key for a banner on the Login screen (or '' when none). */
  sessionMessage: string
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { role, setRole, setUserName } = useRole()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [mode, setMode] = useState<'live' | 'demo' | 'none'>('none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [forcePasswordChange, setForcePasswordChange] = useState(false)
  const [sessionMessage, setSessionMessage] = useState('')

  const applyUser = useCallback((me: CurrentUser) => {
    setUser(me)
    setUserName(me.displayName)
    setRole(roleCodeToUiRole(me.roles))
  }, [setRole, setUserName])

  const clearSession = useCallback(() => {
    tokenStore.clear()
    setUser(null)
    setMode('none')
    setForcePasswordChange(false)
  }, [])

  // Restore session: refresh token -> new pair -> /auth/me; else logged out.
  // (The access token lives in memory, so a reload always starts with a
  // refresh; the single-flight refresh in http.ts keeps concurrent
  // restores to one call.)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isAuthenticated()) {
        setLoading(false)
        return
      }
      // Offline demo session marker (no tokens involved).
      const demoEmail = tokenStore.getDemo()
      if (demoEmail && !tokenStore.getRefresh()) {
        const demo = findUserByEmail(demoEmail)
        if (!cancelled && demo) {
          setMode('demo')
          setUserName(demo.name)
          setRole(demo.role)
        }
        if (!cancelled) setLoading(false)
        return
      }
      try {
        if (!tokenStore.getAccess()) await apiRefresh()
        const me = await getCurrentUser()
        if (cancelled) return
        applyUser(me)
        setMode('live')
      } catch {
        if (!cancelled) clearSession()
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [applyUser, clearSession, setRole, setUserName])

  // Global auth lifecycle events from the http layer.
  useEffect(() => {
    return onAuthEvent((event) => {
      if (event === 'session-expired') {
        // Ignore stale events arriving after an intentional logout.
        if (mode === 'none' && !user) return
        clearSession()
        setSessionMessage('auth.sessionEnded')
      } else if (event === 'password-change-required') {
        setForcePasswordChange(true)
      }
    })
  }, [clearSession, mode, user])

  const signIn = useCallback(async (email: string, password: string) => {
    setError('')
    setSessionMessage('')
    try {
      const pair = await apiLogin({ email, password })
      const me = await getCurrentUser()
      applyUser(me)
      setMode('live')
      setForcePasswordChange(pair.mustChangePassword || me.mustChangePassword)
      return { mustChangePassword: pair.mustChangePassword || me.mustChangePassword, role: roleCodeToUiRole(me.roles) }
    } catch (e) {
      // Backend down (status 0): offline demo fallback so work can continue.
      if (e instanceof ApiError && e.status === 0) {
        const demo = demoAuthenticate(email, password)
        if (!demo) throw new Error('Invalid email or password')
        tokenStore.setDemo(email)
        setMode('demo')
        setUserName(demo.name)
        setRole(demo.role)
        return { mustChangePassword: false, role: demo.role }
      }
      // Re-throw untouched: Login maps status/code to the contract messages
      // (401 wrong credentials, 429 with Retry-After seconds, 400 message).
      throw e
    }
  }, [applyUser, setRole, setUserName])

  const signOut = useCallback(async (messageKey?: string) => {
    try {
      await apiLogout()
    } finally {
      clearSession()
      if (messageKey) setSessionMessage(messageKey)
    }
  }, [clearSession])

  const hasPermission = useCallback((code: string): boolean => {
    if (mode === 'live') return user?.permissions.includes(code) ?? false
    if (mode === 'demo') return DEMO_PERMISSIONS[role]?.includes(code) ?? false
    return false
  }, [mode, user, role])

  const clearForcePasswordChange = useCallback(() => setForcePasswordChange(false), [])

  return (
    <AuthContext.Provider value={{
      user, loading, mode,
      scopeId: user?.organizationScopeIds?.[0] ?? '00000000-0000-0000-0000-000000000000',
      error, forcePasswordChange, clearForcePasswordChange, hasPermission,
      signIn, signOut, sessionMessage,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
