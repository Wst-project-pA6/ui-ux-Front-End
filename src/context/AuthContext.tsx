// Auth provider bound to the contract (POST /auth/login, GET /auth/me).
// Falls back to the local demo directory ONLY when the backend is
// unreachable, so the UI stays usable offline. Contract facts reflected:
// - unknown user and wrong password both -> 401 INVALID_CREDENTIALS
// - mustChangePassword forces a password change (change-password endpoint)
// - UI role is derived from RoleCodes via roleCodeToUiRole (10 -> 7)
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getCurrentUser, login as apiLogin, logout as apiLogout, isAuthenticated } from '../api/auth'
import { ApiError } from '../api/http'
import { roleCodeToUiRole, errorMessage } from '../api/mapping'
import { authenticate as demoAuthenticate } from '../utils/demoAuth'
import { useRole } from './RoleContext'
import type { CurrentUser } from '../api/types'

interface AuthContextValue {
  user: CurrentUser | null
  loading: boolean
  /** Live when tokens came from the API, demo when offline-fallback was used. */
  mode: 'live' | 'demo' | 'none'
  /** First organization scope of the user — required by create payloads. */
  scopeId: string
  error: string
  signIn: (email: string, password: string) => Promise<{ mustChangePassword: boolean; role: import('./RoleContext').Role }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setRole, setUserName } = useRole()
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [mode, setMode] = useState<'live' | 'demo' | 'none'>('none')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Restore session: valid token -> /auth/me; else stay logged out.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!isAuthenticated()) {
        setLoading(false)
        return
      }
      try {
        const me = await getCurrentUser()
        if (cancelled) return
        setUser(me)
        setMode('live')
        setUserName(me.displayName)
        setRole(roleCodeToUiRole(me.roles))
      } catch {
        if (!cancelled) {
          setUser(null)
          setMode('none')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [setRole, setUserName])

  const signIn = useCallback(async (email: string, password: string) => {
    setError('')
    try {
      const pair = await apiLogin({ email, password })
      const me = await getCurrentUser()
      setUser(me)
      setMode('live')
      setUserName(me.displayName)
      const uiRole = roleCodeToUiRole(me.roles)
      setRole(uiRole)
      return { mustChangePassword: pair.mustChangePassword || me.mustChangePassword, role: uiRole }
    } catch (e) {
      // Backend down (status 0): offline demo fallback so work can continue.
      if (e instanceof ApiError && e.status === 0) {
        const demo = demoAuthenticate(email, password)
        if (!demo) throw new Error('Invalid email or password')
        setMode('demo')
        setUserName(demo.name)
        setRole(demo.role)
        return { mustChangePassword: false, role: demo.role }
      }
      const code = e instanceof ApiError ? e.code : ''
      throw new Error(errorMessage(code, e instanceof Error ? e.message : 'Sign in failed'))
    }
  }, [setRole, setUserName])

  const signOut = useCallback(async () => {
    await apiLogout()
    setUser(null)
    setMode('none')
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, mode, scopeId: user?.organizationScopeIds?.[0] ?? '00000000-0000-0000-0000-000000000000', error, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
