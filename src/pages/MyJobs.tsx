import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { jobsV3, type JobCard } from '../api/v3/jobs'
import { LoadingState, EmptyState, ErrorState } from '../components/common/ApiStates'

/**
 * Technician's assigned jobs. The backend scopes GET /job-cards to the
 * caller's assignments (Technician sees only their own jobs, 404 otherwise),
 * so this page simply lists via the same endpoint — no frontend filtering
 * that could leak other jobs.
 */
export default function MyJobs() {
  const navigate = useNavigate()
  const [items, setItems] = useState<JobCard[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: 20, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await jobsV3.list({ page, pageSize: 20 })
      setItems(res.items)
      setMeta(res.page)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
  const stageOf = (j: JobCard) => (j as unknown as { stage?: string }).stage ?? ''

  return (
    <div className="space-y-5">
      <PageHeader title="My Assigned Jobs" subtitle={`Today — ${today} · ${meta.totalItems} jobs`} />

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'In Progress', count: items.filter((j) => stageOf(j) === 'IN_PROGRESS').length },
          { label: 'Pending Start', count: items.filter((j) => stageOf(j) === 'RECEIVED').length },
          { label: 'Quality Check', count: items.filter((j) => stageOf(j) === 'QUALITY_CHECK').length },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-slate-900">{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {status === 'loading' && <LoadingState label="Loading your jobs…" />}
      {status === 'error' && <ErrorState error={error} onRetry={load} title="Failed to load assigned jobs" />}
      {status === 'success' && items.length === 0 && (
        <EmptyState title="No jobs assigned to you" hint="Jobs assigned to you by the Workshop Manager appear here." />
      )}

      {status === 'success' && items.length > 0 && (
        <div className="flex flex-col gap-3">
          {items.map((job) => {
            const r = job as unknown as Record<string, string | undefined>
            return (
              <div key={job.id} className="w-full text-start bg-white border border-slate-200 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs font-semibold text-blue-600" dir="ltr">{job.jobNumber}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{r.priority}</span>
                    </div>
                    <p className="font-semibold text-slate-900 text-sm">{r.complaint}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.customerDisplayName} · {r.vehiclePlate}</p>
                  </div>
                  <Badge variant={badgeVariantFor(stageOf(job))} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Full workflow (start, labor, parts, QC) lives on the job card.</span>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/job-cards/${job.id}`)}>Open →</Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {status === 'success' && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-3 border rounded-lg disabled:opacity-40">‹ Prev</button>
          <span className="text-sm">Page {page} of {meta.totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="h-8 px-3 border rounded-lg disabled:opacity-40">Next ›</button>
        </div>
      )}

    </div>
  )
}
