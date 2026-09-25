import React from 'react'
import { ApiError } from '../../api/errors'
import { Button } from '../ui/Button'

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center" role="status">
      <div className="mx-auto w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-slate-500 mt-3">{label}</p>
    </div>
  )
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string
  hint?: string
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

export function ErrorState({
  error,
  onRetry,
  title = 'Something went wrong',
}: {
  error: unknown
  onRetry?: () => void
  title?: string
}) {
  const api = error instanceof ApiError ? error : null
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.'
  return (
    <div className="bg-white border border-red-200 rounded-xl px-6 py-8 text-center" role="alert">
      <p className="text-sm font-semibold text-red-700">{title}</p>
      <p className="text-sm text-slate-600 mt-1">{message}</p>
      {api?.code && (
        <p className="text-xs text-slate-400 mt-2 font-mono" dir="ltr">
          {api.code}
          {api.requestId ? ` · requestId ${api.requestId}` : ''}
          {api.status === 429 && api.retryAfterSeconds ? ` · retry in ${api.retryAfterSeconds}s` : ''}
        </p>
      )}
      {api?.details && api.details.length > 0 && (
        <ul className="text-xs text-slate-500 mt-2 space-y-1">
          {api.details.map((d, i) => (
            <li key={i}>
              {d.field ? <span className="font-mono">{d.field}: </span> : null}
              {d.message ?? d.code}
            </li>
          ))}
        </ul>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  )
}

export function FieldErrors({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || !error.details?.length) return null
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2" role="alert">
      {error.details.map((d, i) => (
        <p key={i} className="text-xs text-red-700">
          {d.field ? <span className="font-mono">{d.field}: </span> : null}
          {d.message ?? d.code}
        </p>
      ))}
      {error.requestId && (
        <p className="text-xs text-red-400 mt-1 font-mono">requestId {error.requestId}</p>
      )}
    </div>
  )
}
