import { useCallback, useEffect, useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { notificationsV3, type Notification } from '../api/v3/platform'
import { LoadingState, EmptyState, ErrorState } from '../components/common/ApiStates'
import { backendErrorMessage } from '../api/v3/types'

export default function Notifications() {
  const { showToast } = useToast()
  const [items, setItems] = useState<Notification[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await notificationsV3.list({ page, pageSize: 20, unread: unreadOnly || undefined })
      setItems(res.items)
      setMeta(res.page)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [page, unreadOnly])

  useEffect(() => { load() }, [load])

  const markRead = async (id: string) => {
    setBusyId(id)
    try {
      const updated = await notificationsV3.markRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? updated : n)))
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Notifications" subtitle={`${meta.totalItems} total`} />
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" checked={unreadOnly} onChange={(e) => { setUnreadOnly(e.target.checked); setPage(1) }} className="w-4 h-4" />
            Unread only
          </label>
          <span className="text-xs text-slate-400 ms-auto">Polls every 45s in the shell · no push in v3</span>
        </div>
        {status === 'loading' && <div className="p-4"><LoadingState label="Loading notifications…" /></div>}
        {status === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} title="Failed to load notifications" /></div>}
        {status === 'success' && items.length === 0 && (
          <div className="p-4"><EmptyState title="No notifications" hint="You are all caught up." /></div>
        )}
        {status === 'success' && items.length > 0 && (
          <>
            <div className="divide-y divide-slate-50">
              {items.map((n) => (
                <div key={n.id} className="px-4 py-3 flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.readAt ? 'bg-slate-200' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${n.readAt ? 'text-slate-500' : 'text-slate-800 font-medium'}`}>{n.message}</p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{n.eventType} · {n.entityType} {String(n.entityId).slice(0, 8)}… · {n.createdAt}</p>
                    {n.readAt && <p className="text-xs text-slate-400">Read {n.readAt}</p>}
                  </div>
                  {!n.readAt && (
                    <Button variant="secondary" size="sm" disabled={busyId === n.id} onClick={() => markRead(n.id)}>
                      {busyId === n.id ? '…' : 'Mark read'}
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-2 rounded-lg border disabled:opacity-40">‹</button>
                <span className="text-sm px-2">{page} / {meta.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="h-8 px-2 rounded-lg border disabled:opacity-40">›</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
