import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './errors'

export type ApiStatus = 'idle' | 'loading' | 'success' | 'error' | 'offline'

export interface ApiQueryState<T> {
  data: T | null
  status: ApiStatus
  error: ApiError | null
  /** True when the request failed because the backend is unreachable. */
  offline: boolean
  reload: () => void
}

/**
 * Runs a GET request on mount and exposes loading / error / offline states.
 * When `fallback` is provided and the backend cannot be reached, the hook
 * resolves with the fallback data and `offline: true` so pages keep working
 * against local seed data with an explicit offline indicator — never a fake
 * success.
 */
export function useApiQuery<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  options?: { fallback?: T; deps?: unknown[] },
): ApiQueryState<T> {
  const [data, setData] = useState<T | null>(null)
  const [status, setStatus] = useState<ApiStatus>('idle')
  const [error, setError] = useState<ApiError | null>(null)
  const [offline, setOffline] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const deps = options?.deps ?? []

  useEffect(() => {
    const controller = new AbortController()
    setStatus('loading')
    setError(null)
    fetcherRef
      .current(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setData(result)
        setOffline(false)
        setStatus('success')
      })
      .catch((err) => {
        if (controller.signal.aborted) return
        if (options?.fallback !== undefined && err instanceof ApiError && err.isNetworkError) {
          setData(options.fallback)
          setOffline(true)
          setStatus('offline')
          return
        }
        setError(err instanceof ApiError ? err : new ApiError({
          message: err instanceof Error ? err.message : 'Unexpected error',
          code: 'UNKNOWN_ERROR',
          status: 0,
        }))
        setStatus('error')
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadKey, ...deps])

  const reload = useCallback(() => setReloadKey((k) => k + 1), [])

  return { data, status, error, offline, reload }
}

/** Friendly one-line message for an API error. */
export function apiErrorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message
  if (err instanceof Error) return err.message
  return 'An unexpected error occurred.'
}
