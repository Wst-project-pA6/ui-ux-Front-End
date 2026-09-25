import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { request } from '../api/client'
import { tokenStorage } from '../api/tokenStorage'
import type { Schemas } from '../api/v3/types'

export type AuthMe = Schemas['AuthMeResponseDto']

interface AuthContextValue {
  me: AuthMe | null
  loading: boolean
  error: string | null
  permissions: string[]
  roles: string[]
  organizationScopeIds: string[]
  hasPermission: (perm: string) => boolean
  hasAnyPermission: (perms: string[]) => boolean
  reload: () => void
}

const AuthContext = createContext<AuthContextValue>({
  me: null,
  loading: false,
  error: null,
  permissions: [],
  roles: [],
  organizationScopeIds: [],
  hasPermission: () => false,
  hasAnyPermission: () => false,
  reload: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<AuthMe | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!tokenStorage.getAccessToken()) {
      setMe(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    request<AuthMe>('/auth/me', { signal: controller.signal })
      .then((res) => {
        if (controller.signal.aborted) return
        setMe(res)
        setLoading(false)
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        setMe(null)
        setError(err instanceof Error ? err.message : 'Failed to load session.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])

  const permissions: string[] = React.useMemo(() => {
    const raw = (me as unknown as { permissions?: unknown })?.permissions
    return Array.isArray(raw) ? raw.filter((p): p is string => typeof p === 'string') : []
  }, [me])

  const roles: string[] = React.useMemo(() => {
    const raw = (me as unknown as { roles?: unknown })?.roles
    if (Array.isArray(raw)) {
      return raw
        .map((r) => (typeof r === 'string' ? r : (r as { name?: string })?.name ?? ''))
        .filter(Boolean) as string[]
    }
    return []
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
      value={{ me, loading, error, permissions, roles, organizationScopeIds, hasPermission, hasAnyPermission, reload }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
