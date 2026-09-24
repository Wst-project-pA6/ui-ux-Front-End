import React from 'react'
import { ApiError } from '../../api/http'
import { errorMessage } from '../../api/mapping'

/** Contract-aware inline states: loading skeletons, typed errors, empty. */
export function LoadingRows({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-slate-50" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-center gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-full bg-slate-100" />
          <div className="flex-1">
            <div className="h-3 w-2/5 rounded bg-slate-100" />
            <div className="mt-2 h-2.5 w-1/4 rounded bg-slate-50" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ApiErrorBanner({
  error,
  onRetry,
  fallback,
}: {
  error: ApiError
  onRetry: () => void
  fallback?: boolean
}) {
  const msg = errorMessage(error.code, error.message)
  return (
    <div role="alert" className="m-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-center justify-between gap-3">
      <span>
        {msg}
        {error.isRateLimited() && error.retryAfter ? ` (retry in ${error.retryAfter}s)` : ''}
        {fallback ? ' — showing cached demo data.' : ''}
        {error.requestId ? <span className="block text-xs text-red-400 mt-0.5">ref {error.requestId}</span> : null}
      </span>
      <button onClick={onRetry} className="shrink-0 px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-medium hover:bg-red-700">
        Retry
      </button>
    </div>
  )
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  )
}

export function DemoBadge({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
      Offline demo data
    </span>
  )
}
