import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { request, refreshOnce } from '../api/client'
import { tokenStorage } from '../api/tokenStorage'
import { ApiError } from '../api/errors'
import type { Schemas } from '../api/v3/types'

export type AuthMe = Schemas['AuthMeResponseDto']

interface LoginResult {
  mustChangePassword: boolean
  permissions: string[]
}

interface AuthContextValue {
  me: AuthMe | null
  loading: boolean
  bootstrapping: boolean
  error: string | null
  permissions: string[]
  roles: string[]
  organizationScopeIds: string[]
  mustChangePassword: boolean
  hasPermission: (perm: string) => boolean
  hasAnyPermission: (perms: string[]) => boolean
  login: (email: string, password: string) => Promise<LoginResult>
  logout: () => Promise<void>
  reload: () => void
}

const AuthContext = createContext<AuthContextValue>({
  me: null,
  loading: false,
  bootstrapping: true,
  error: null,
  permissions: [],
  roles: [],
  organizationScopeIds: [],
  mustChangePassword: false,
  hasPermission: () => false,
  hasAnyPermission: () => false,
  login: async () => ({ mustChangePassword: false, permissions: [] }),
  logout: async () => {},
  reload: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null)
  const [loading, setLoading] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [mustChangePassword, setMustChangePassword] = useState(false)
  const [tick, setTick] = useState(0)

  const loadMe = useCallback(async (signal?: AbortSignal): Promise<AuthMe | null> => {
    try {
      const res = await request<AuthMe>('/auth/me', { signal })
      setMe(res)
      setError(null)
      setMustChangePassword(res.mustChangePassword === true)
      return res
    } catch (err) {
      if (signal?.aborted) return null
      setMe(null)
      if (err instanceof ApiError && err.code === 'PASSWORD_CHANGE_REQUIRED') {
        setMustChangePassword(true)
        return null
      }
      setError(err instanceof Error ? err.message : 'Failed to load session.')
      return null
    }
  }, [])

  // Bootstrap: restore the session after a page reload. The access token is
  // memory-only so it is gone — use the sessionStorage refresh token (single
  // shared refresh) to mint a fresh pair, then load the identity.
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    const boot = async () => {
      setBootstrapping(true)
      if (!tokenStorage.hasSession()) {
        if (!cancelled) {
          setMe(null)
          setBootstrapping(false)
        }
        return
      }
      if (!tokenStorage.getAccessToken()) {
        try {
          await refreshOnce()
        } catch {
          if (!cancelled) {
            tokenStorage.clear()
            setMe(null)
            setBootstrapping(false)
          }
          return
        }
      }
      if (!cancelled) {
        await loadMe(controller.signal)
        setBootstrapping(false)
      }
    }
    boot()
    return () => {
      cancelled = true
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick])

  // A 403 PASSWORD_CHANGE_REQUIRED anywhere forces the change-password flow.
  useEffect(() => {
    const handler = () => setMustChangePassword(true)
    window.addEventListener('wst:password-required', handler)
    return () => window.removeEventListener('wst:password-required', handler)
  }, [])

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      setLoading(true)
      setError(null)
      try {
        const pair = await request<{
          accessToken: string
          refreshToken: string
          mustChangePassword?: boolean
        }>('/auth/login', {
          method: 'POST',
          body: { email, password },
          anonymous: true,
          skipAuthRefresh: true,
        })
        tokenStorage.setAccessToken(pair.accessToken)
        tokenStorage.setRefreshToken(pair.refreshToken)
        if (pair.mustChangePassword === true) {
          setMe(null)
          setMustChangePassword(true)
          return { mustChangePassword: true, permissions: [] }
        }
        const identity = await loadMe()
        const perms = ((identity as unknown as { permissions?: unknown })?.permissions as string[]) ?? []
        const list = Array.isArray(perms) ? perms.filter((p): p is string => typeof p === 'string') : []
        setMustChangePassword(identity?.mustChangePassword === true)
        return { mustChangePassword: identity?.mustChangePassword === true, permissions: list }
      } finally {
        setLoading(false)
      }
    },
    [loadMe],
  )

  const logout = useCallback(async (): Promise<void> => {
    const refreshToken = tokenStorage.getRefreshToken()
    try {
      if (refreshToken) {
        // Sent with the current Authorization bearer + refreshToken body.
        await request<void>('/auth/logout', {
          method: 'POST',
          body: { refreshToken },
          skipAuthRefresh: true,
        })
      }
    } catch {
      /* the session is cleared locally regardless — see finally */
    } finally {
      // Always clear: tokens, identity, flags. The epoch bump discards any
      // late in-flight refresh result so auth can never be restored.
      tokenStorage.clear()
      setMe(null)
      setMustChangePassword(false)
      setError(null)
    }
  }, [])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  const permissions: string[] = React.useMemo(() => {
    const raw = (me as unknown as { permissions?: unknown })?.permissions
    return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : []
  }, [me])

  const roles: string[] = React.useMemo(() => {
    const raw = (me as unknown as { roles?: unknown })?.roles
    return Array.isArray(raw) ? raw.filter((r): r is string => typeof r === 'string') : []
  }, [me])

  const organizationScopeIds: string[] = React.useMemo(() => {
    const raw = (me as unknown as { organizationScopeIds?: unknown })?.organizationScopeIds
    return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : []
  }, [me])

  const hasPermission = useCallback((perm: string) => permissions.includes(perm), [permissions])
  const hasAnyPermission = useCallback(
    (perms: string[]) => perms.some((p) => permissions.includes(p)),
    [permissions],
  )

  return (
    <AuthContext.Provider
      value={{
        me,
        loading,
        bootstrapping,
        error,
        permissions,
        roles,
        organizationScopeIds,
        mustChangePassword,
        hasPermission,
        hasAnyPermission,
        login,
        logout,
        reload,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
