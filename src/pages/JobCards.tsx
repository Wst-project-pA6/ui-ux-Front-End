import React, { useState, useEffect } from 'react'
import { useSearchParams, useParams } from 'react-router-dom'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { jobsApi, vehiclesApi } from '../api/resources'
import { ApiError } from '../api/http'
import { isUuid } from '../api/identity'
import { STAGE_TO_UI, UI_TO_STAGE, errorMessage } from '../api/mapping'
import type { JobStage } from '../api/types'

type JobStatus = 'received' | 'in-progress' | 'quality-check' | 'ready' | 'delivered'

// Next stage per the contract lifecycle RECEIVED -> IN_PROGRESS -> QUALITY_CHECK -> READY -> DELIVERED.
// Transitions MUST use POST /job-cards/{id}/transitions (never PATCH of stage).
const NEXT_STAGE: Record<Exclude<JobStatus, 'delivered'>, { to: JobStage; labelKey: 'jobCards.action.startWork' | 'jobCards.action.sendQC' | 'jobCards.action.markReady' | 'jobCards.action.deliver' }> = {
  received: { to: 'IN_PROGRESS', labelKey: 'jobCards.action.startWork' },
  'in-progress': { to: 'QUALITY_CHECK', labelKey: 'jobCards.action.sendQC' },
  'quality-check': { to: 'READY', labelKey: 'jobCards.action.markReady' },
  ready: { to: 'DELIVERED', labelKey: 'jobCards.action.deliver' },
}

const INITIAL_JOBS = [
  { id: 'JC-2024-0912', customer: 'Mohammed Al-Rashid', vehicle: 'Toyota Camry 2022', plate: 'ABC-1234', tech: 'Khalid H.', bay: 'Bay 3', priority: 'High', status: 'in-progress' as JobStatus, due: '2024-09-19', complaint: 'Engine vibration at idle', type: 'Mechanical', approval: 'approved' as const },
  { id: 'JC-2024-0911', customer: 'Sarah Al-Anazi', vehicle: 'Honda Accord 2021', plate: 'XYZ-5678', tech: 'Fahad A.', bay: 'Bay 1', priority: 'Normal', status: 'quality-check' as JobStatus, due: '2024-09-19', complaint: 'AC not cooling properly', type: 'AC', approval: 'approved' as const },
  { id: 'JC-2024-0910', customer: 'Rayan Omar', vehicle: 'BMW 520i 2023', plate: 'DEF-9012', tech: 'Ali M.', bay: 'Bay 2', priority: 'Normal', status: 'ready' as JobStatus, due: '2024-09-18', complaint: 'Brake squealing', type: 'Brakes', approval: 'approved' as const },
  // WST-FR-04/05: billable work cannot start before customer approval — this
  // job is still pending approval, so "Start Work" must stay blocked (the
  // backend rejects it with 409 CUSTOMER_APPROVAL_REQUIRED).
  { id: 'JC-2024-0909', customer: 'Noura Al-Saud', vehicle: 'Hyundai Tucson 2022', plate: 'GHI-3456', tech: 'Khalid H.', bay: 'Bay 4', priority: 'Low', status: 'received' as JobStatus, due: '2024-09-20', complaint: 'Routine service 20,000 km', type: 'Service', approval: 'pending' as const },
  { id: 'JC-2024-0908', customer: 'Omar Al-Harthi', vehicle: 'Ford F-150 2020', plate: 'JKL-7890', tech: 'Fahad A.', bay: 'Bay 5', priority: 'High', status: 'in-progress' as JobStatus, due: '2024-09-19', complaint: 'Transmission slipping', type: 'Transmission', approval: 'approved' as const },
  { id: 'JC-2024-0907', customer: 'Fatima Hassan', vehicle: 'Nissan Altima 2021', plate: 'MNO-1234', tech: 'Nasser K.', bay: 'Bay 1', priority: 'Normal', status: 'delivered' as JobStatus, due: '2024-09-17', complaint: 'Battery replacement', type: 'Electrical', approval: 'approved' as const },
]

// Demo source lines — the invoice total is DERIVED from these (WST-FR-09:
// computed from logged labour + issued parts, never typed).
const demoLaborLines = [
  { desc: 'Diagnostic check', hours: 0.5, rate: 200 },
  { desc: 'Engine tune-up', hours: 2, rate: 200 },
]

const demoPartLines = [
  { part: 'Oil Filter', sku: 'OIL-F-001', qty: 1, unit: 35 },
  { part: 'Engine Oil 5W-30 (4L)', sku: 'OIL-E-5W30', qty: 2, unit: 65 },
]

const STAGE_STATUSES: JobStatus[] = ['received', 'in-progress', 'quality-check', 'ready', 'delivered']

export default function JobCards() {
  const { t } = useLang()
  const [searchParams, setSearchParams] = useSearchParams()
  const { id: urlId } = useParams<{ id?: string }>()
  const [view, setView] = useState<'table' | 'kanban'>('table')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | ''>(
    (searchParams.get('status') as JobStatus | null) ?? ''
  )
  const [addOpen, setAddOpen] = useState(false)
  const [jobs, setJobs] = useState(INITIAL_JOBS)
  const [detailJob, setDetailJob] = useState<(typeof INITIAL_JOBS)[0] | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [transitionError, setTransitionError] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [vehicleOptions, setVehicleOptions] = useState<Array<{ id: string; label: string }> | null>(null)

  // Live vehicles (backend vehicleId must be a UUID). Demo fallback offline.
  useEffect(() => {
    if (!addOpen || vehicleOptions !== null) return
    let cancelled = false
    vehiclesApi.list({ pageSize: 100, sort: 'plate' })
      .then((res) => {
        if (!cancelled) setVehicleOptions(res.items.map((v) => ({ id: v.id, label: `${v.make} ${v.model} — ${v.plate}` })))
      })
      .catch(() => { if (!cancelled) setVehicleOptions(null) })
    return () => { cancelled = true }
  }, [addOpen, vehicleOptions])

  // Contract: POST /job-cards (server generates a unique jobNumber, stage
  // RECEIVED). Required fields enforced with 422.
  const handleCreateJob = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const vehicleId = String(fd.get('vehicle') ?? '')
    const complaint = String(fd.get('complaint') ?? '').trim()
    const serviceTypeRaw = String(fd.get('serviceType') ?? 'OTHER')
    const serviceType = (['MAINTENANCE', 'REPAIR', 'DIAGNOSTIC', 'INSPECTION', 'OTHER'] as const).includes(serviceTypeRaw as never)
      ? (serviceTypeRaw as 'MAINTENANCE' | 'REPAIR' | 'DIAGNOSTIC' | 'INSPECTION' | 'OTHER')
      : 'OTHER'
    const priorityRaw = String(fd.get('priority') ?? 'NORMAL')
    const priority = (['LOW', 'NORMAL', 'HIGH', 'URGENT'] as const).includes(priorityRaw as never)
      ? (priorityRaw as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT')
      : 'NORMAL'
    const mileageAtIntake = Number(fd.get('mileage') ?? 0)
    const dateStr = String(fd.get('expectedDate') ?? '')
    if (!vehicleId || !complaint) {
      setCreateError('Vehicle and complaint are required')
      return
    }
    setCreating(true)
    setCreateError('')
    try {
      await jobsApi.create({
        vehicleId, complaint, serviceType, priority, mileageAtIntake,
        expectedCompletionAt: dateStr ? new Date(`${dateStr}T17:00:00`).toISOString() : new Date(Date.now() + 86400000).toISOString(),
      })
      setAddOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        setJobs((prev) => [...prev, {
          id: `JC-LOCAL-${Date.now()}`, customer: 'Demo customer', vehicle: 'Demo vehicle',
          plate: '—', tech: 'Unassigned', bay: 'Unassigned',
          priority: priority === 'HIGH' ? 'High' : priority === 'LOW' ? 'Low' : priority === 'URGENT' ? 'Urgent' : 'Normal',
          status: 'received' as JobStatus, due: dateStr || '—', complaint,
          type: serviceType === 'REPAIR' ? 'Mechanical' : serviceType === 'DIAGNOSTIC' ? 'Electrical' : serviceType === 'MAINTENANCE' ? 'Service' : serviceType === 'INSPECTION' ? 'Inspection' : 'Other',
          approval: 'pending' as const,
        }])
        setAddOpen(false)
      } else {
        setCreateError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Create failed')
      }
    } finally {
      setCreating(false)
    }
  }

  // Contract stage transition: POST .../transitions with expectedFromStage for
  // safe concurrency. Offline (demo rows have non-UUID ids) -> local advance.
  // Hard rule (brief "Hardest part" + WST-FR-05): billable work never starts
  // before customer approval — enforced here, not just noted in the banner.
  const advanceStage = async () => {
    if (!detailJob || detailJob.status === 'delivered') return
    const next = NEXT_STAGE[detailJob.status as Exclude<JobStatus, 'delivered'>]
    setTransitioning(true)
    setTransitionError('')
    try {
      if (detailJob.status === 'received' && detailJob.approval !== 'approved') {
        throw new ApiError(409, {
          code: 'CUSTOMER_APPROVAL_REQUIRED',
          message: 'Customer approval is required before work can start.',
          requestId: 'local',
        })
      }
      const isJobUuid = isUuid(detailJob.id)
      if (!isJobUuid) {
        // Demo fallback: advance locally (no backend row exists).
        const ui = STAGE_TO_UI[next.to] as JobStatus
        setDetailJob({ ...detailJob, status: ui })
        return
      }
      await jobsApi.transition(detailJob.id, {
        toStage: next.to,
        expectedFromStage: UI_TO_STAGE[detailJob.status],
      })
      const ui = STAGE_TO_UI[next.to] as JobStatus
      setDetailJob({ ...detailJob, status: ui })
    } catch (e) {
      const code = e instanceof ApiError ? e.code : ''
      setTransitionError(errorMessage(code, e instanceof Error ? e.message : 'Transition failed'))
    } finally {
      setTransitioning(false)
    }
  }

  // Sync statusFilter when ?status= param changes
  useEffect(() => {
    const param = searchParams.get('status') as JobStatus | null
    setStatusFilter(param ?? '')
  }, [searchParams])

  // Auto-open detail modal when navigated to /job-cards/:id
  useEffect(() => {
    if (urlId) {
      const found = jobs.find((j) => j.id === urlId) ?? null
      setDetailJob(found)
    }
  }, [urlId])

  const handleStatusFilterChange = (val: JobStatus | '') => {
    setStatusFilter(val)
    if (val) {
      setSearchParams({ status: val }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }

  const filtered = jobs.filter((j) => {
    const matchesSearch =
      j.id.includes(search) ||
      j.customer.toLowerCase().includes(search.toLowerCase()) ||
      j.plate.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !statusFilter || j.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('jobCards.title')}
        subtitle={`${jobs.length} ${t('jobCards.subtitle')}`}
        actions={
          <>
            <div className="flex border border-slate-200 rounded-lg overflow-hidden">
              <button
                onClick={() => setView('table')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {t('jobCards.view.table')}
              </button>
              <button
                onClick={() => setView('kanban')}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                {t('jobCards.view.kanban')}
              </button>
            </div>
            <Button
              onClick={() => setAddOpen(true)}
              icon={<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}
            >
              {t('jobCards.newBtn')}
            </Button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder={t('jobCards.search')} />
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value as JobStatus | '')}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('jobCards.filter.allStatuses')}</option>
          {STAGE_STATUSES.map((s) => <option key={s} value={s}>{t(`badge.${s}` as any)}</option>)}
        </select>
        <select className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>{t('jobCards.filter.allPriorities')}</option>
          <option>{t('jobCards.filter.high')}</option>
          <option>{t('jobCards.filter.normal')}</option>
          <option>{t('jobCards.filter.low')}</option>
        </select>
        <select className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option>{t('jobCards.filter.allTechnicians')}</option>
          <option>Khalid H.</option>
          <option>Fahad A.</option>
          <option>Ali M.</option>
        </select>
      </div>

      {view === 'table' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-50">
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.job')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.customerVehicle')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.type')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.technician')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.bay')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.priority')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.status')}</th>
                  <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('jobCards.col.due')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((job) => (
                  <tr
                    key={job.id}
                    onClick={() => setDetailJob(job)}
                    className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 text-blue-600 font-mono text-xs font-medium" dir="ltr">{job.id}</td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800">{job.customer}</p>
                      <p className="text-xs text-slate-400">{job.vehicle} · <span className="font-mono" dir="ltr">{job.plate}</span></p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{job.type}</td>
                    <td className="px-6 py-4 text-slate-600">{job.tech}</td>
                    <td className="px-6 py-4 text-slate-600">{job.bay}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        job.priority === 'High' ? 'bg-red-50 text-red-700' :
                        job.priority === 'Normal' ? 'bg-slate-100 text-slate-600' :
                        'bg-green-50 text-green-700'
                      }`}>
                        {job.priority === 'High' ? t('jobCards.filter.high') : job.priority === 'Normal' ? t('jobCards.filter.normal') : t('jobCards.filter.low')}
                      </span>
                    </td>
                    <td className="px-6 py-4"><Badge variant={job.status} /></td>
                    <td className="px-6 py-4 text-slate-500 text-xs" dir="ltr">{job.due}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Kanban View */
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGE_STATUSES.map((status) => {
            const stageJobs = filtered.filter((j) => j.status === status)
            return (
              <div key={status} className="min-w-[260px] flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={status} showDot />
                    <span className="text-xs font-semibold text-slate-600">{stageJobs.length}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {stageJobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setDetailJob(job)}
                      className="bg-white border border-slate-200 rounded-xl p-4 cursor-pointer hover:shadow-sm hover:border-blue-200 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-mono text-blue-600" dir="ltr">{job.id}</p>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                          job.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {job.priority === 'High' ? t('jobCards.filter.high') : job.priority === 'Normal' ? t('jobCards.filter.normal') : t('jobCards.filter.low')}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-slate-900 mt-2">{job.customer}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{job.vehicle}</p>
                      <div className="mt-3 pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                        <span>{job.tech}</span>
                        <span>{job.bay}</span>
                      </div>
                    </div>
                  ))}
                  {stageJobs.length === 0 && (
                    <div className="border-2 border-dashed border-slate-100 rounded-xl p-6 text-center text-xs text-slate-300">
                      {t('jobCards.kanban.noJobs')}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Job Detail Modal */}
      {detailJob && (
        <Modal
          open={!!detailJob}
          onClose={() => { setDetailJob(null); setTransitionError('') }}
          title={`Job Card ${detailJob.id}`}
          size="xl"
          footer={
            <>
              <Button variant="secondary" onClick={() => { setDetailJob(null); setTransitionError('') }}>{t('action.close')}</Button>
              {detailJob.status !== 'delivered' && (
                <Button loading={transitioning} onClick={advanceStage}>
                  {t(NEXT_STAGE[detailJob.status as Exclude<JobStatus, 'delivered'>].labelKey)}
                </Button>
              )}
            </>
          }
        >
          <div className="flex flex-col gap-5">
            {transitionError && (
              <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                {transitionError}
              </div>
            )}
            {/* Warning banner if billable not started */}
            {detailJob.status === 'received' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <svg width="16" height="16" className="text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t('jobCards.detail.approvalWarning.title')}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{t('jobCards.detail.approvalWarning.desc')}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: t('jobCards.detail.customer'), value: detailJob.customer },
                { label: t('jobCards.detail.vehicle'), value: detailJob.vehicle },
                { label: t('jobCards.detail.plate'), value: <span dir="ltr">{detailJob.plate}</span> },
                { label: t('jobCards.detail.complaint'), value: detailJob.complaint },
                { label: t('jobCards.detail.type'), value: detailJob.type },
                { label: t('jobCards.detail.priority'), value: detailJob.priority === 'High' ? t('jobCards.filter.high') : detailJob.priority === 'Normal' ? t('jobCards.filter.normal') : t('jobCards.filter.low') },
                { label: t('jobCards.detail.technician'), value: detailJob.tech },
                { label: t('jobCards.detail.bay'), value: detailJob.bay },
                { label: t('jobCards.detail.expectedDate'), value: <span dir="ltr">{detailJob.due}</span> },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <p className="mt-0.5 text-sm font-medium text-slate-800">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Labor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">{t('jobCards.detail.labor.title')}</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">{t('jobCards.detail.labor.add')}</button>
              </div>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-start text-xs text-slate-500 font-semibold">{t('jobCards.detail.labor.col.description')}</th>
                      <th className="px-4 py-2 text-start text-xs text-slate-500 font-semibold">{t('jobCards.detail.labor.col.technician')}</th>
                      <th className="px-4 py-2 text-end text-xs text-slate-500 font-semibold">{t('jobCards.detail.labor.col.hours')}</th>
                      <th className="px-4 py-2 text-end text-xs text-slate-500 font-semibold">{t('jobCards.detail.labor.col.rate')}</th>
                      <th className="px-4 py-2 text-end text-xs text-slate-500 font-semibold">{t('jobCards.detail.labor.col.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoLaborLines.map((l, i) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="px-4 py-2 text-slate-700">{l.desc}</td>
                        <td className="px-4 py-2 text-slate-500">{detailJob.tech}</td>
                        <td className="px-4 py-2 text-end text-slate-700" dir="ltr">{l.hours}h</td>
                        <td className="px-4 py-2 text-end text-slate-500" dir="ltr">SAR {l.rate}/h</td>
                        <td className="px-4 py-2 text-end font-semibold text-slate-800" dir="ltr">SAR {l.hours * l.rate}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-slate-700 text-end">{t('jobCards.detail.labor.totalLabel')}</td>
                      <td className="px-4 py-2 text-end font-bold text-slate-900" dir="ltr">SAR {demoLaborLines.reduce((s, l) => s + l.hours * l.rate, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Parts */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-700">{t('jobCards.detail.parts.title')}</h3>
                <button className="text-xs text-blue-600 font-medium hover:underline">{t('jobCards.detail.parts.add')}</button>
              </div>
              <div className="border border-slate-100 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2 text-start text-xs text-slate-500 font-semibold">{t('jobCards.detail.parts.col.part')}</th>
                      <th className="px-4 py-2 text-start text-xs text-slate-500 font-semibold">{t('jobCards.detail.parts.col.sku')}</th>
                      <th className="px-4 py-2 text-end text-xs text-slate-500 font-semibold">{t('jobCards.detail.parts.col.qty')}</th>
                      <th className="px-4 py-2 text-end text-xs text-slate-500 font-semibold">{t('jobCards.detail.parts.col.unitCost')}</th>
                      <th className="px-4 py-2 text-end text-xs text-slate-500 font-semibold">{t('jobCards.detail.parts.col.total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {demoPartLines.map((p, i) => (
                      <tr key={i} className="border-t border-slate-50">
                        <td className="px-4 py-2 text-slate-700">{p.part}</td>
                        <td className="px-4 py-2 text-slate-400 font-mono text-xs" dir="ltr">{p.sku}</td>
                        <td className="px-4 py-2 text-end text-slate-700">{p.qty}</td>
                        <td className="px-4 py-2 text-end text-slate-500" dir="ltr">SAR {p.unit}</td>
                        <td className="px-4 py-2 text-end font-semibold text-slate-800" dir="ltr">SAR {p.qty * p.unit}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-slate-200 bg-slate-50">
                      <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-slate-700 text-end">{t('jobCards.detail.parts.totalLabel')}</td>
                      <td className="px-4 py-2 text-end font-bold text-slate-900" dir="ltr">SAR {demoPartLines.reduce((s, p) => s + p.qty * p.unit, 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-2 flex justify-end">
                <div className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm">
                  <span className="font-semibold">{t('jobCards.detail.invoiceTotal')}: <span dir="ltr">SAR {demoLaborLines.reduce((s, l) => s + l.hours * l.rate, 0) + demoPartLines.reduce((s, p) => s + p.qty * p.unit, 0)}</span></span>
                  <p className="text-xs text-blue-200 mt-0.5">{t('jobCards.detail.invoiceNote')}</p>
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* New Job Card Modal */}
      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('jobCards.modal.newTitle')}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('action.cancel')}</Button>
            <Button loading={creating} onClick={() => (document.getElementById('job-create-form') as HTMLFormElement | null)?.requestSubmit()}>{t('jobCards.modal.createBtn')}</Button>
          </>
        }
      >
        <form id="job-create-form" onSubmit={handleCreateJob} className="flex flex-col gap-4">
          {createError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{createError}</div>
          )}
          <Select name="vehicle" label={t('jobCards.form.vehicle')} options={[
            { value: '', label: t('jobCards.form.selectVehicle') },
            ...(vehicleOptions ?? [{ id: 'v1', label: 'Toyota Camry 2022 — ABC-1234' }]).map((v) => ({ value: v.id, label: v.label })),
          ]} required />
          <p className="text-xs text-slate-400">Customer is derived from the selected vehicle. Bay and technician are assigned separately after creation.</p>
          <Textarea name="complaint" label={t('jobCards.form.complaint')} placeholder={t('jobCards.form.complaintPlaceholder')} required rows={3} />
          <div className="grid grid-cols-3 gap-4">
            <Select name="serviceType" label={t('jobCards.form.serviceType')} options={[{ value: 'OTHER', label: t('jobCards.form.selectType') }, { value: 'MAINTENANCE', label: 'Maintenance' }, { value: 'REPAIR', label: 'Repair' }, { value: 'DIAGNOSTIC', label: 'Diagnostic' }, { value: 'INSPECTION', label: 'Inspection' }, { value: 'OTHER', label: 'Other' }]} />
            <Select name="priority" label={t('jobCards.form.priority')} options={[{ value: 'NORMAL', label: t('jobCards.filter.normal') }, { value: 'LOW', label: t('jobCards.filter.low') }, { value: 'HIGH', label: t('jobCards.filter.high') }, { value: 'URGENT', label: 'Urgent' }]} />
            <Input name="expectedDate" label={t('jobCards.form.expectedDate')} type="date" />
          </div>
          <Input name="mileage" label={t('jobCards.form.mileage')} type="number" placeholder="Enter current mileage" />
        </form>
      </Modal>
    </div>
  )
}
