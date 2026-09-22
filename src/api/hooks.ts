// Data-fetching hooks with contract-aware states:
// loading / error (ApiError code preserved) / empty / offline-fallback.
// Pagination follows the contract: page (default 1), pageSize (default 20,
// max 100), sort ("-createdAt" style). Unknown filters/sorts -> 400, so the
// hooks only forward whitelisted params built by each page.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ApiError } from './http'
import { CONTRACT } from './config'
import type { ListQuery, Page } from './types'

export interface ListState<T> {
  items: T[]
  page: Page<T>['page'] | null
  total: number
  loading: boolean
  error: ApiError | null
  isFallback: boolean
  reload: () => void
  setPage: (page: number) => void
}

interface UseApiListOptions<T> {
  /** When provided, used if the API is unreachable (offline demo). */
  fallbackItems?: T[]
  query?: ListQuery
  /** Set false to defer the first fetch until reload() is called. */
  immediate?: boolean
}

export function useApiList<T>(
  fetcher: (q: ListQuery) => Promise<Page<T>>,
  opts: UseApiListOptions<T> = {},
): ListState<T> {
  const { fallbackItems, query, immediate = true } = opts
  const [items, setItems] = useState<T[]>(fallbackItems ?? [])
  const [pageInfo, setPageInfo] = useState<Page<T>['page'] | null>(null)
  const [loading, setLoading] = useState(immediate)
  const [error, setError] = useState<ApiError | null>(null)
  const [isFallback, setIsFallback] = useState(false)
  const [page, setPage] = useState(query?.page ?? CONTRACT.defaultPage)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher
  const queryKey = JSON.stringify({ ...query, page })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q: ListQuery = {
        page,
        pageSize: query?.pageSize ?? CONTRACT.defaultPageSize,
        ...(query?.sort ? { sort: query.sort } : {}),
        ...(query?.q ? { q: query.q } : {}),
      }
      // Forward only defined extra filters (contract rejects unknown ones).
      for (const [k, v] of Object.entries(query ?? {})) {
        if (['page', 'pageSize', 'sort', 'q'].includes(k)) continue
        if (v !== undefined && v !== '') q[k] = v
      }
      const res = await fetcherRef.current(q)
      setItems(res.items)
      setPageInfo(res.page)
      setIsFallback(false)
    } catch (e) {
      const apiErr = e instanceof ApiError ? e : new ApiError(0, e instanceof Error ? e.message : 'Unknown error')
      // Offline / backend-down (status 0) -> graceful demo fallback, never blank.
      if (apiErr.status === 0 && fallbackItems) {
        setItems(fallbackItems)
        setPageInfo(null)
        setIsFallback(true)
        setError(null)
      } else {
        setError(apiErr)
        if (fallbackItems) {
          setItems(fallbackItems)
          setIsFallback(true)
        }
      }
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey])

  useEffect(() => {
    if (immediate) void load()
  }, [load, immediate])

  return {
    items,
    page: pageInfo,
    total: pageInfo ? pageInfo.totalItems : items.length,
    loading,
    error,
    isFallback,
    reload: load,
    setPage,
  }
}

export interface ItemState<T> {
  data: T | null
  loading: boolean
  error: ApiError | null
  reload: () => void
}

export function useApiItem<T>(fetcher: () => Promise<T>, deps: unknown[] = []): ItemState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<ApiError | null>(null)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcherRef.current())
    } catch (e) {
      setError(e instanceof ApiError ? e : new ApiError(0, e instanceof Error ? e.message : 'Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { data, loading, error, reload: load }
}
