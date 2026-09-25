import { useCallback, useEffect, useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useAuth } from '../context/AuthContext'
import { auditV3, type AuditEvent } from '../api/v3/platform'
import { LoadingState, EmptyState, ErrorState } from '../components/common/ApiStates'
import { PERMS } from '../api/v3/types'

export default function AuditLog() {
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canRead = hasPermission(PERMS.auditRead)

  const [items, setItems] = useState<AuditEvent[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [action, setAction] = useState('')
  const [entityType, setEntityType] = useState('')
  const [outcome, setOutcome] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<AuditEvent | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await auditV3.list({
        page, pageSize: 20,
        action: action || undefined,
        entityType: entityType || undefined,
        outcome: outcome || undefined,
        entityId: q.trim() || undefined,
      })
      setItems(res.items)
      setMeta(res.page)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
      if ((err as { status?: number })?.status === 403) showToast('error', 'Forbidden', 'You do not have audit.read.')
    }
  }, [page, action, entityType, outcome, q])

  useEffect(() => { load() }, [load])

  if (!canRead) {
    return (
      <div className="space-y-6">
        <PageHeader title="Audit log" subtitle="Restricted" />
        <EmptyState title="You do not have audit.read permission" hint="System Administrator sees everything; Finance sees finance/stock subset only." />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Audit log" subtitle={`${meta.totalItems} events · read-only`} />
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col gap-2 px-4 py-3 border-b border-slate-100 md:flex-row md:items-center">
          <div className="flex-1"><SearchBar value={q} onChange={(v) => { setQ(v); setPage(1) }} placeholder="Filter by entity ID…" /></div>
          <input value={action} onChange={(e) => { setAction(e.target.value); setPage(1) }} placeholder="action e.g. JOB_CARD.ASSIGN" className="h-9 px-3 border border-slate-200 rounded-lg text-sm w-52" />
          <input value={entityType} onChange={(e) => { setEntityType(e.target.value); setPage(1) }} placeholder="entityType e.g. JOB_CARD" className="h-9 px-3 border border-slate-200 rounded-lg text-sm w-44" />
          <select value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm">
            <option value="">All outcomes</option><option value="SUCCESS">SUCCESS</option><option value="DENIED">DENIED</option><option value="FAILED">FAILED</option>
          </select>
        </div>
        {status === 'loading' && <div className="p-4"><LoadingState label="Loading audit events…" /></div>}
        {status === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} title="Failed to load audit log" /></div>}
        {status === 'success' && items.length === 0 && <div className="p-4"><EmptyState title="No audit events" /></div>}
        {status === 'success' && items.length > 0 && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-50">
                  <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase">When</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Action</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Entity</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Outcome</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Summary</th>
                </tr></thead>
                <tbody>
                  {items.map((e) => (
                    <tr key={e.id} onClick={() => setSelected(e)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{e.occurredAt}</td>
                      <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                      <td className="px-4 py-3 text-xs font-mono">{e.entityType} {String(e.entityId).slice(0, 8)}…</td>
                      <td className="px-4 py-3 text-xs">{e.outcome}</td>
                      <td className="px-4 py-3 text-xs text-slate-600 max-w-md truncate">{(e as unknown as { summary?: string }).summary ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.action} size="lg"
          footer={<Button variant="secondary" onClick={() => setSelected(null)}>Close</Button>}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(selected as unknown as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 font-mono">{k}</p>
                <p className="text-xs font-mono break-all mt-0.5">{typeof v === 'string' ? v : JSON.stringify(v)}</p>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}
