import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { jobsV3, type JobCard, type Approval, type WorkItem, type LaborEntry } from '../api/v3/jobs'
import { invoicesV3, type Invoice } from '../api/v4/management'
import { baysV3, serviceTypesV3, techniciansV3 } from '../api/v3/workshop'
import { attachmentsV3 } from '../api/v3/platform'
import { vehiclesV3 } from '../api/v3/vehicles'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'
import { PERMS, formatMoney, backendErrorMessage } from '../api/v3/types'
import { newIdempotencyKey, fetchAuthenticatedBlob } from '../api/client'

const PAGE_SIZE = 20
const STAGES = ['RECEIVED', 'IN_PROGRESS', 'QUALITY_CHECK', 'READY', 'DELIVERED']

type DetailTab = 'overview' | 'approvals' | 'work' | 'labor' | 'parts' | 'quality' | 'photos' | 'invoice' | 'history'

export default function JobCards() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const { id: urlId } = useParams<{ id?: string }>()

  const canCreate = hasPermission(PERMS.jobsCreate)
  const canUpdate = hasPermission(PERMS.jobsUpdate)
  const canAssign = hasPermission(PERMS.jobsAssign)
  const canStart = hasPermission(PERMS.jobsStart)
  const canSubmitQc = hasPermission(PERMS.jobsSubmitQc)
  const canDeliver = hasPermission(PERMS.jobsDeliver)
  const canApproveRead = hasPermission(PERMS.approvalsRead)
  const canApproveRecord = hasPermission(PERMS.approvalsRecord)
  const canApproveRequest = hasPermission(PERMS.approvalsRequest)
  const canLaborRead = hasPermission(PERMS.laborRead)
  const canLaborWrite = hasPermission(PERMS.laborWrite)
  const canQuality = hasPermission(PERMS.qualityPerform)
  const canUpload = hasPermission(PERMS.attachmentsUpload) || hasPermission(PERMS.attachmentsUploadJob)
  const canIssue = hasPermission(PERMS.inventoryIssue)
  const canReverse = hasPermission(PERMS.inventoryReverse)
  const canInvoicesRead = hasPermission(PERMS.invoicesRead)
  const navigate = useNavigate()

  const [items, setItems] = useState<JobCard[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [stage, setStage] = useState('')
  const [priority, setPriority] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [view, setView] = useState<'table' | 'kanban'>('table')

  const [detailId, setDetailId] = useState<string | null>(urlId ?? null)
  const [detail, setDetail] = useState<JobCard | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Create form
  const [createOpen, setCreateOpen] = useState(false)
  const [serviceTypes, setServiceTypes] = useState<{ id: string; name: string; code?: string }[]>([])
  const [createForm, setCreateForm] = useState({ vehicleId: '', complaint: '', serviceTypeId: '', priority: 'NORMAL', mileageAtIntake: '', expectedCompletionAt: '', workItems: '' })
  const [createError, setCreateError] = useState<unknown>(null)
  const [intakePhotos, setIntakePhotos] = useState<string[]>([])

  // Sub-resources
  const [approvals, setApprovals] = useState<Approval[]>([])
  const [workItems, setWorkItems] = useState<WorkItem[]>([])
  const [labor, setLabor] = useState<LaborEntry[]>([])
  const [reservations, setReservations] = useState<never[]>([])
  const [issues, setIssues] = useState<never[]>([])
  const [quality, setQuality] = useState<never[]>([])
  const [history, setHistory] = useState<never[]>([])
  const [photos, setPhotos] = useState<{ id: string }[]>([])
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({})
  const [jobInvoices, setJobInvoices] = useState<Invoice[]>([])

  const [assignForm, setAssignForm] = useState({ bayId: '', technicianId: '', scheduledStartAt: '', expectedCompletionAt: '', overrideReason: '' })
  const [bays, setBays] = useState<{ id: string; name: string; code?: string }[]>([])
  const [technicians, setTechnicians] = useState<{ id: string; displayName: string }[]>([])
  const [conflicts, setConflicts] = useState<never[]>([])
  const [transitionReason, setTransitionReason] = useState('')
  const [pendingTransition, setPendingTransition] = useState<string | null>(null)

  useEffect(() => {
    const id = window.setTimeout(() => { setDebouncedQ(q.trim()); setPage(1) }, 400)
    return () => window.clearTimeout(id)
  }, [q])

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await jobsV3.list({ page, pageSize: PAGE_SIZE, q: debouncedQ || undefined, stage: stage || undefined, priority: priority || undefined })
      setItems(res.items)
      setMeta(res.page)
      setStatus('success')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [page, debouncedQ, stage, priority])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (urlId) setDetailId(urlId) }, [urlId])

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true)
    try {
      const job = await jobsV3.get(id)
      setDetail(job)
      const [ap, wi, hb] = await Promise.all([
        canApproveRead ? jobsV3.approvals(id, { page: 1, pageSize: 50 }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
        jobsV3.workItems(id, { page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        jobsV3.stageHistory(id, { page: 1, pageSize: 50 }).catch(() => ({ items: [] })),
      ])
      setApprovals((ap as { items: Approval[] }).items)
      setWorkItems((wi as { items: WorkItem[] }).items)
      setHistory(((hb as { items: never[] }).items ?? []) as never[])
      if (canLaborRead) {
        const lb = await jobsV3.labor(id, { page: 1, pageSize: 100 }).catch(() => ({ items: [] }))
        setLabor((lb as { items: LaborEntry[] }).items)
      }
      const [rs, is, qc, ph] = await Promise.all([
        jobsV3.reservations(id).catch(() => ({ items: [] })),
        jobsV3.issues(id).catch(() => ({ items: [] })),
        jobsV3.qualityChecks(id).catch(() => ({ items: [] })),
        jobsV3.jobAttachments(id).catch(() => ({ items: [] })),
      ])
      setReservations(((rs as { items: never[] }).items ?? []) as never[])
      setIssues(((is as { items: never[] }).items ?? []) as never[])
      setQuality(((qc as { items: never[] }).items ?? []) as never[])
      setPhotos((((ph as { items: { id: string }[] }).items ?? []) as { id: string }[]))
      if (canInvoicesRead) {
        const inv = await invoicesV3.list({ jobId: id, page: 1, pageSize: 10 }).catch(() => ({ items: [] }))
        setJobInvoices(((inv as { items: Invoice[] }).items ?? []) as Invoice[])
      } else {
        setJobInvoices([])
      }
    } catch (err) {
      showToast('error', 'Failed to load job', backendErrorMessage(err))
    } finally {
      setDetailLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canApproveRead, canLaborRead, canInvoicesRead])

  useEffect(() => {
    if (detailId) {
      setDetailTab('overview')
      loadDetail(detailId)
    } else {
      setDetail(null)
    }
  }, [detailId, loadDetail])

  const loadPickers = useCallback(async () => {
    try {
      const [st, b, tc] = await Promise.all([
        serviceTypesV3.list({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        baysV3.list({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        techniciansV3.list({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      ])
      const stItems = Array.isArray(st) ? st : (st as { items: never[] }).items ?? []
      setServiceTypes((stItems as unknown as { id: string; name: string }[]).map((s) => ({ id: s.id, name: (s as unknown as { name?: string }).name ?? s.id })))
      setBays((((b as { items: never[] }).items ?? []) as unknown as { id: string; name: string }[]))
      setTechnicians((((tc as { items: never[] }).items ?? []) as unknown as { id: string; displayName: string }[]))
    } catch { /* pickers optional */ }
  }, [])

  useEffect(() => { loadPickers() }, [loadPickers])

  const filtered = useMemo(() => items, [items])

  const create = async () => {
    if (saving) return
    if (!createForm.vehicleId || !createForm.complaint.trim() || !createForm.serviceTypeId) {
      setCreateError(new ApiError({ message: 'Vehicle, complaint and service type are required.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    if (createForm.complaint.trim().length < 3 || createForm.complaint.trim().length > 2000) {
      setCreateError(new ApiError({ message: 'Complaint must be 3–2000 characters.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    if (!createForm.expectedCompletionAt) {
      setCreateError(new ApiError({ message: 'Expected completion is required (contract v4).', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    if (createForm.mileageAtIntake === '' || !Number.isInteger(Number(createForm.mileageAtIntake)) || Number(createForm.mileageAtIntake) < 0) {
      setCreateError(new ApiError({ message: 'Mileage at intake is required (whole number ≥ 0) and must be ≥ vehicle mileage.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setSaving(true)
    setCreateError(null)
    try {
      const payload: Record<string, unknown> = {
        vehicleId: createForm.vehicleId,
        complaint: createForm.complaint.trim(),
        serviceTypeId: createForm.serviceTypeId,
        priority: createForm.priority,
        mileageAtIntake: Number(createForm.mileageAtIntake),
        expectedCompletionAt: new Date(createForm.expectedCompletionAt).toISOString(),
        ...(createForm.workItems.trim() ? { workItems: createForm.workItems.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 50).map((description) => ({ description })) } : {}),
        ...(intakePhotos.length ? { attachmentIds: intakePhotos } : {}),
      }
      const job = await jobsV3.create(payload as never)
      showToast('success', 'Job card created', job.jobNumber)
      setCreateOpen(false)
      setCreateForm({ vehicleId: '', complaint: '', serviceTypeId: '', priority: 'NORMAL', mileageAtIntake: '', expectedCompletionAt: '', workItems: '' })
      setIntakePhotos([])
      load()
    } catch (err) {
      setCreateError(err)
    } finally {
      setSaving(false)
    }
  }

  const uploadIntakePhoto = async (file: File) => {
    try {
      const att = await attachmentsV3.upload(file, 'JOB_PHOTO')
      setIntakePhotos((p) => [...p, att.id].slice(0, 10))
      showToast('success', 'Photo uploaded', file.name)
    } catch (err) {
      showToast('error', 'Upload failed', backendErrorMessage(err))
    }
  }

  const doTransition = async (toStage: string) => {
    if (!detail || saving) return
    setSaving(true)
    try {
      const updated = await jobsV3.transition(detail.id, {
        toStage,
        expectedFromStage: (detail as unknown as { stage?: string }).stage,
        ...(transitionReason.trim() ? { reason: transitionReason.trim() } : {}),
      } as never)
      setDetail(updated)
      showToast('success', 'Stage updated', `${toStage}`)
      setPendingTransition(null)
      setTransitionReason('')
      loadDetail(detail.id)
      load()
    } catch (err) {
      const msg = backendErrorMessage(err)
      showToast('error', 'Transition failed', err instanceof ApiError && err.requestId ? `${msg} (requestId ${err.requestId})` : msg)
    } finally {
      setSaving(false)
    }
  }

  const doAssign = async () => {
    if (!detail || saving) return
    if (!assignForm.bayId || !assignForm.technicianId) {
      showToast('error', 'Bay and technician required', '')
      return
    }
    if (!assignForm.scheduledStartAt || !assignForm.expectedCompletionAt) {
      showToast('error', 'Schedule required', 'Scheduled start and expected completion are required (contract: JobAssignmentDto).')
      return
    }
    setSaving(true)
    setConflicts([])
    try {
      const updated = await jobsV3.assign(detail.id, {
        version: (detail as unknown as { version?: number }).version,
        bayId: assignForm.bayId,
        technicianId: assignForm.technicianId,
        scheduledStartAt: new Date(assignForm.scheduledStartAt).toISOString(),
        expectedCompletionAt: new Date(assignForm.expectedCompletionAt).toISOString(),
        ...(assignForm.overrideReason.trim() ? { overrideReason: assignForm.overrideReason.trim() } : {}),
      } as never)
      setDetail(updated)
      showToast('success', 'Assigned', 'Bay + technician set.')
      loadDetail(detail.id)
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SCHEDULE_CONFLICT') {
        setConflicts((err.conflicts ?? []) as never[])
        showToast('error', 'Scheduling conflict', 'Review conflicts below. Only BAY_* conflicts with overridable:true can be overridden.')
      } else {
        showToast('error', 'Assign failed', backendErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const stageOf = (j: JobCard) => (j as unknown as { stage?: string }).stage ?? ''
  const billable = (j: JobCard) => (j as unknown as { approvalSummary?: { billableWorkAllowed?: boolean; pendingApprovalCount?: number } }).approvalSummary

  return (
    <div className="space-y-6">
      <PageHeader title={t('jobCards.title')} subtitle={`${meta.totalItems} job cards`}
        actions={<>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setView('table')} className={`px-3 py-1.5 text-sm font-medium ${view === 'table' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{t('jobCards.view.table')}</button>
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-sm font-medium ${view === 'kanban' ? 'bg-slate-900 text-white' : 'text-slate-600'}`}>{t('jobCards.view.kanban')}</button>
          </div>
          {canCreate
            ? <Button onClick={() => { setCreateError(null); setCreateOpen(true) }}>{t('jobCards.newBtn')}</Button>
            : <span title="Requires jobs.create permission (Service Advisor role)"><Button disabled>{t('jobCards.newBtn')}</Button></span>}
        </>} />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar value={q} onChange={setQ} placeholder={t('jobCards.search')} />
        <select value={stage} onChange={(e) => { setStage(e.target.value); setPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">{t('jobCards.filter.allStatuses')}</option>
          {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }} className="h-9 px-3 border border-slate-200 rounded-lg text-sm bg-white">
          <option value="">All priorities</option><option value="HIGH">High</option><option value="NORMAL">Normal</option><option value="LOW">Low</option><option value="URGENT">Urgent</option>
        </select>
        {(stage || priority || q) && <button onClick={() => { setQ(''); setStage(''); setPriority(''); setPage(1) }} className="text-xs text-slate-500 font-medium">Clear filters</button>}
      </div>

      {status === 'loading' && <LoadingState label="Loading job cards…" />}
      {status === 'error' && <ErrorState error={error} onRetry={load} title="Failed to load job cards" />}
      {status === 'success' && filtered.length === 0 && <EmptyState title="No job cards match your filters" />}

      {status === 'success' && filtered.length > 0 && view === 'table' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs uppercase text-slate-500">Job</th>
                <th className="px-6 py-3 text-start text-xs uppercase text-slate-500">Customer / Vehicle</th>
                <th className="px-6 py-3 text-start text-xs uppercase text-slate-500">Priority</th>
                <th className="px-6 py-3 text-start text-xs uppercase text-slate-500">Stage</th>
                <th className="px-6 py-3 text-start text-xs uppercase text-slate-500">Approvals</th>
              </tr></thead>
              <tbody>
                {filtered.map((job) => {
                  const r = job as unknown as Record<string, string | undefined>
                  const sum = billable(job)
                  const declined = stageOf(job) === 'DELIVERED' && sum && sum.billableWorkAllowed === false
                  return (
                    <tr key={job.id} onClick={() => setDetailId(job.id)} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                      <td className="px-6 py-4 text-blue-600 font-mono text-xs" dir="ltr">{job.jobNumber}{declined && <span className="ms-2 text-amber-600">returned without work</span>}</td>
                      <td className="px-6 py-4"><p className="font-medium">{r.customerDisplayName ?? ''}</p><p className="text-xs text-slate-400">{r.vehiclePlate ?? ''} · {r.serviceTypeName ?? ''}</p></td>
                      <td className="px-6 py-4 text-xs">{r.priority}</td>
                      <td className="px-6 py-4"><Badge variant={badgeVariantFor(stageOf(job))} /></td>
                      <td className="px-6 py-4 text-xs">{sum?.pendingApprovalCount ? `${sum.pendingApprovalCount} pending` : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
            <p className="text-sm text-slate-400">Page {meta.page} of {meta.totalPages} · {meta.totalItems} total</p>
            <div className="flex gap-1">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-2 border rounded-lg disabled:opacity-40">‹</button>
              <span className="text-sm px-2">{page} / {meta.totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="h-8 px-2 border rounded-lg disabled:opacity-40">›</button>
            </div>
          </div>
        </div>
      )}

      {status === 'success' && filtered.length > 0 && view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {STAGES.map((s) => {
            const stageJobs = filtered.filter((j) => stageOf(j) === s)
            return (
              <div key={s} className="min-w-[260px] flex-1">
                <p className="text-xs font-semibold text-slate-600 mb-2">{s} ({stageJobs.length})</p>
                <div className="flex flex-col gap-3">
                  {stageJobs.map((job) => {
                    const r = job as unknown as Record<string, string | undefined>
                    return (
                      <div key={job.id} onClick={() => setDetailId(job.id)} className="bg-white border rounded-xl p-4 cursor-pointer hover:shadow-sm">
                        <p className="text-xs font-mono text-blue-600" dir="ltr">{job.jobNumber}</p>
                        <p className="text-sm font-semibold mt-1">{r.customerDisplayName}</p>
                        <p className="text-xs text-slate-500">{r.vehiclePlate}</p>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {detailId && (
        <Modal open={!!detailId} onClose={() => setDetailId(null)} title={detail ? `Job ${detail.jobNumber}` : 'Job detail'} size="xl"
          footer={<>
            <Button variant="secondary" onClick={() => setDetailId(null)}>{t('action.close')}</Button>
            {detail && stageOf(detail) === 'RECEIVED' && canStart && <Button disabled={saving} onClick={() => setPendingTransition('IN_PROGRESS')}>Start work</Button>}
            {detail && stageOf(detail) === 'IN_PROGRESS' && canSubmitQc && <Button disabled={saving} onClick={() => setPendingTransition('QUALITY_CHECK')}>Send to quality check</Button>}
            {detail && stageOf(detail) === 'QUALITY_CHECK' && canQuality && <Button disabled={saving} onClick={() => setPendingTransition('READY')}>Mark ready (QC passed)</Button>}
            {detail && stageOf(detail) === 'READY' && canDeliver && <Button disabled={saving} onClick={() => setPendingTransition('DELIVERED')}>Deliver</Button>}
          </>}>
          {detailLoading || !detail ? <LoadingState /> : (
            <div className="flex flex-col gap-4">
              <div className="flex gap-2 flex-wrap border-b border-slate-100 pb-2">
                {(['overview', 'approvals', 'work', 'labor', 'parts', 'quality', 'photos', 'invoice', 'history'] as DetailTab[]).map((tb) => (
                  <button key={tb} onClick={() => setDetailTab(tb)} className={`px-3 py-1.5 text-xs font-medium rounded-lg ${detailTab === tb ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>{tb}</button>
                ))}
              </div>

              {detailTab === 'overview' && (
                <OverviewTab detail={detail} canUpdate={canUpdate} canAssign={canAssign}
                  bays={bays} technicians={technicians} assignForm={assignForm} setAssignForm={setAssignForm}
                  conflicts={conflicts} onAssign={doAssign} saving={saving}
                  onReload={() => detail && loadDetail(detail.id)} showToast={showToast} />
              )}
              {detailTab === 'approvals' && (
                <ApprovalsTab job={detail} approvals={approvals} canRecord={canApproveRecord} canRequest={canApproveRequest}
                  canUpdate={canUpdate} onReload={() => detail && loadDetail(detail.id)} showToast={showToast} />
              )}
              {detailTab === 'work' && (
                <WorkTab job={detail} items={workItems} approvals={approvals} canUpdate={canUpdate} canLaborWrite={canLaborWrite}
                  onReload={() => detail && loadDetail(detail.id)} showToast={showToast} />
              )}
              {detailTab === 'labor' && (
                <LaborTab job={detail} entries={labor} workItems={workItems} canWrite={canLaborWrite}
                  onReload={() => detail && loadDetail(detail.id)} showToast={showToast} />
              )}
              {detailTab === 'parts' && (
                <PartsTab job={detail} reservations={reservations} issues={issues} canIssue={canIssue} canReverse={canReverse}
                  onReload={() => detail && loadDetail(detail.id)} showToast={showToast} />
              )}
              {detailTab === 'quality' && (
                <QualityTab job={detail} checks={quality} canPerform={canQuality}
                  onReload={() => detail && loadDetail(detail.id)} showToast={showToast} />
              )}
              {detailTab === 'photos' && (
                <PhotosTab job={detail} photos={photos} urls={photoUrls} setUrls={setPhotoUrls} canUpload={canUpload}
                  onReload={() => detail && loadDetail(detail.id)} showToast={showToast} />
              )}
              {detailTab === 'invoice' && (
                <JobInvoiceTab job={detail} invoices={jobInvoices} canRead={canInvoicesRead} navigate={navigate} />
              )}
              {detailTab === 'history' && (
                <div className="flex flex-col gap-2">
                  {history.length === 0 ? <p className="text-xs text-slate-400">No stage history.</p> : (history as unknown as { id: string; fromStage?: string; toStage: string; transitionedAt: string; reason?: string }[]).map((h) => (
                    <div key={h.id} className="border border-slate-100 rounded-lg p-3 text-sm">
                      <p className="font-mono text-xs">{h.fromStage ?? '—'} → {h.toStage} · {h.transitionedAt}</p>
                      {h.reason && <p className="text-xs text-slate-500 mt-1">{h.reason}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}

      <ConfirmDialog open={!!pendingTransition} title={pendingTransition === 'DELIVERED' ? 'Deliver to customer' : `Move to ${pendingTransition}`}
        message={pendingTransition === 'DELIVERED' ? 'Delivery requires a finalized invoice (ISSUED or PAID). The server answers 409 INVOICE_REQUIRED otherwise — check the invoice tab first.' : `Move job forward? Reason is optional and stored on stage history.`}
        confirmLabel="Confirm" onConfirm={() => pendingTransition && doTransition(pendingTransition)} onCancel={() => setPendingTransition(null)} />

      <Modal open={createOpen} onClose={() => !saving && setCreateOpen(false)} title="New job card" size="lg"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={saving} onClick={create}>{saving ? 'Creating…' : 'Create'}</Button></>}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Vehicle ID (UUID)" value={createForm.vehicleId} onChange={(e) => setCreateForm({ ...createForm, vehicleId: e.target.value })} required placeholder="Pick a vehicle, paste its UUID" />
            <Select label="Service type" value={createForm.serviceTypeId} onChange={(e) => setCreateForm({ ...createForm, serviceTypeId: e.target.value })}
              options={[{ value: '', label: 'Select type' }, ...serviceTypes.map((s) => ({ value: s.id, label: s.name }))]} required />
          </div>
          <Textarea label="Complaint" value={createForm.complaint} onChange={(e) => setCreateForm({ ...createForm, complaint: e.target.value })} required rows={3} />
          <div className="grid grid-cols-3 gap-4">
            <Select label="Priority" value={createForm.priority} onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value })}
              options={[{ value: 'LOW', label: 'Low' }, { value: 'NORMAL', label: 'Normal' }, { value: 'HIGH', label: 'High' }]} />
            <Input label="Mileage at intake (≥ vehicle mileage)" type="number" value={createForm.mileageAtIntake} onChange={(e) => setCreateForm({ ...createForm, mileageAtIntake: e.target.value })} required />
            <Input label="Expected completion (required)" type="datetime-local" value={createForm.expectedCompletionAt} onChange={(e) => setCreateForm({ ...createForm, expectedCompletionAt: e.target.value })} required />
          </div>
          <Textarea label="Initial work checklist (one per line, ≤50)" value={createForm.workItems} onChange={(e) => setCreateForm({ ...createForm, workItems: e.target.value })} rows={3} />
          <div>
            <label className="text-sm font-medium">Intake photos (JOB_PHOTO, ≤10)</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple onChange={(e) => {
              const files = Array.from(e.target.files ?? [])
              files.slice(0, 10 - intakePhotos.length).forEach(uploadIntakePhoto)
              e.target.value = ''
            }} className="mt-1 text-sm" />
            <p className="text-xs text-slate-400 mt-1">{intakePhotos.length} uploaded: {intakePhotos.join(', ').slice(0, 120)}</p>
          </div>
          {createError ? <FieldErrors error={createError} /> : null}
        </div>
      </Modal>
    </div>
  )
}

function OverviewTab({ detail, canUpdate, canAssign, bays, technicians, assignForm, setAssignForm, conflicts, onAssign, saving, onReload, showToast }: {
  detail: JobCard; canUpdate: boolean; canAssign: boolean;
  bays: { id: string; name: string }[]; technicians: { id: string; displayName: string }[];
  assignForm: { bayId: string; technicianId: string; scheduledStartAt: string; expectedCompletionAt: string; overrideReason: string };
  setAssignForm: (v: { bayId: string; technicianId: string; scheduledStartAt: string; expectedCompletionAt: string; overrideReason: string }) => void;
  conflicts: never[]; onAssign: () => void; saving: boolean; onReload: () => void;
  showToast: (k: 'success' | 'error' | 'info', t: string, m?: string) => void;
}) {
  const r = detail as unknown as Record<string, string | number | undefined>
  const [editOpen, setEditOpen] = useState(false)
  const [form, setForm] = useState({ priority: String(r.priority ?? 'NORMAL'), expectedCompletionAt: '', complaint: String(r.complaint ?? '') })
  const [editSaving, setEditSaving] = useState(false)

  const save = async () => {
    setEditSaving(true)
    try {
      await jobsV3.update(detail.id, {
        version: (detail as unknown as { version?: number }).version,
        priority: form.priority,
        ...(form.complaint ? { complaint: form.complaint } : {}),
        ...(form.expectedCompletionAt ? { expectedCompletionAt: new Date(form.expectedCompletionAt).toISOString() } : {}),
      } as never)
      showToast('success', 'Job updated', '')
      setEditOpen(false)
      onReload()
    } catch (err) {
      showToast('error', 'Update failed', err instanceof ApiError && err.code === 'VERSION_CONFLICT' ? 'Record changed — reloaded latest version.' : backendErrorMessage(err))
      onReload()
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {['jobNumber', 'customerDisplayName', 'vehiclePlate', 'serviceTypeName', 'priority', 'stage', 'mileageAtIntake', 'expectedCompletionAt', 'bayId', 'technicianId', 'version'].map((k) => (
          <div key={k} className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-400">{k}</p>
            <p className="text-sm font-medium break-all">{String(r[k] ?? '—')}</p>
          </div>
        ))}
      </div>
      {canUpdate && <div><Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>Edit job</Button></div>}
      {canAssign && (
        <div className="border border-slate-200 rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Assign bay + technician (Workshop Manager, requires version)</p>
          <div className="grid grid-cols-2 gap-3">
            <Select label="Bay" value={assignForm.bayId} onChange={(e) => setAssignForm({ ...assignForm, bayId: e.target.value })}
              options={[{ value: '', label: 'Select bay' }, ...bays.map((b) => ({ value: b.id, label: b.name }))]} />
            <Select label="Technician" value={assignForm.technicianId} onChange={(e) => setAssignForm({ ...assignForm, technicianId: e.target.value })}
              options={[{ value: '', label: 'Select technician' }, ...technicians.map((x) => ({ value: x.id, label: x.displayName }))]} />
            <Input label="Scheduled start" type="datetime-local" value={assignForm.scheduledStartAt} onChange={(e) => setAssignForm({ ...assignForm, scheduledStartAt: e.target.value })} />
            <Input label="Expected completion" type="datetime-local" value={assignForm.expectedCompletionAt} onChange={(e) => setAssignForm({ ...assignForm, expectedCompletionAt: e.target.value })} />
          </div>
          {conflicts.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800">Scheduling conflicts ({conflicts.length})</p>
              {(conflicts as unknown as { kind: string; message?: string; overridable?: boolean }[]).map((c, i) => (
                <p key={i} className="text-xs text-amber-700 font-mono">{c.kind}: {c.message} (overridable: {String(c.overridable)})</p>
              ))}
              {(conflicts as unknown as { overridable?: boolean }[]).every((c) => c.overridable) ? (
                <Input label="Override reason (10–500, needs schedule.override-conflict)" value={assignForm.overrideReason} onChange={(e) => setAssignForm({ ...assignForm, overrideReason: e.target.value })} />
              ) : (
                <p className="text-xs text-red-600 mt-1">A conflict is not overridable — pick a different bay/time.</p>
              )}
            </div>
          )}
          <Button size="sm" disabled={saving} onClick={onAssign} className="mt-3">{saving ? 'Assigning…' : 'Assign'}</Button>
        </div>
      )}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit job" size="md"
        footer={<><Button variant="secondary" onClick={() => setEditOpen(false)}>Cancel</Button><Button disabled={editSaving} onClick={save}>{editSaving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={['LOW', 'NORMAL', 'HIGH'].map((p) => ({ value: p, label: p }))} />
          <Input label="Complaint" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} />
          <Input label="Expected completion" type="datetime-local" value={form.expectedCompletionAt} onChange={(e) => setForm({ ...form, expectedCompletionAt: e.target.value })} />
        </div>
      </Modal>
    </div>
  )
}

function ApprovalsTab({ job, approvals, canRecord, canRequest, canUpdate, onReload, showToast }: {
  job: JobCard; approvals: Approval[]; canRecord: boolean; canRequest: boolean; canUpdate: boolean;
  onReload: () => void; showToast: (k: 'success' | 'error' | 'info', t: string, m?: string) => void;
}) {
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ scope: 'INITIAL_WORK', description: '', amount: '' })
  const [saving, setSaving] = useState(false)
  const [decideId, setDecideId] = useState<string | null>(null)
  const [decideForm, setDecideForm] = useState({ decision: 'APPROVED', method: 'PHONE', approvedByName: '', amount: '', notes: '' })

  const create = async () => {
    setSaving(true)
    try {
      await jobsV3.createApproval(job.id, {
        scope: form.scope,
        description: form.description,
        ...(form.amount ? { estimatedAmount: { amount: Number(form.amount).toFixed(4), currency: 'EGP' } } : {}),
      } as never)
      showToast('success', 'Approval request created', '')
      setCreateOpen(false)
      setForm({ scope: 'INITIAL_WORK', description: '', amount: '' })
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const decide = async () => {
    if (!decideId) return
    setSaving(true)
    try {
      await jobsV3.decideApproval(job.id, decideId, {
        decision: decideForm.decision,
        method: decideForm.method,
        approvedByName: decideForm.approvedByName || undefined,
        ...(decideForm.amount ? { estimatedAmount: { amount: Number(decideForm.amount).toFixed(4), currency: 'EGP' } } : {}),
        ...(decideForm.notes ? { notes: decideForm.notes } : {}),
      } as never)
      showToast('success', `Approval ${decideForm.decision}`, decideForm.decision === 'REJECTED' ? 'May auto-close the job if initial scope declined.' : '')
      setDecideId(null)
      onReload()
    } catch (err) {
      showToast('error', 'Decision failed', backendErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const [withdrawId, setWithdrawId] = useState<string | null>(null)
  const [withdrawReason, setWithdrawReason] = useState('')
  const [workItemApprovalId, setWorkItemApprovalId] = useState<string | null>(null)
  const [workItemDescription, setWorkItemDescription] = useState('')

  const withdraw = async () => {
    if (!withdrawId || withdrawReason.trim().length < 3) {
      showToast('error', 'Reason required', 'Withdrawal needs a reason (3+ characters).')
      return
    }
    try {
      await jobsV3.withdrawApproval(job.id, withdrawId, { reason: withdrawReason.trim() })
      showToast('success', 'Withdrawn', '')
      setWithdrawId(null)
      setWithdrawReason('')
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const addAsWorkItem = async () => {
    if (!workItemApprovalId || workItemDescription.trim().length < 1 || workItemDescription.trim().length > 300) {
      showToast('error', 'Description required', 'Work item description must be 1–300 characters.')
      return
    }
    try {
      await jobsV3.createWorkItem(job.id, { description: workItemDescription.trim(), approvalId: workItemApprovalId } as never)
      showToast('success', 'Work item added', '')
      setWorkItemApprovalId(null)
      setWorkItemDescription('')
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {(canRecord || canRequest) && <div><Button size="sm" onClick={() => setCreateOpen(true)}>Request approval</Button></div>}
      {approvals.length === 0 ? <p className="text-xs text-slate-400">No approvals yet.</p> : approvals.map((a) => {
        const r = a as unknown as Record<string, string | undefined>
        return (
          <div key={a.id} className="border border-slate-100 rounded-lg p-3">
            <p className="text-sm font-medium">{r.scope} · {r.status}</p>
            <p className="text-xs text-slate-500 mt-0.5">{r.description}</p>
            {r.estimatedAmount && <p className="text-xs text-slate-500">Amount: {JSON.stringify(r.estimatedAmount)}</p>}
            <div className="flex gap-2 mt-2">
              {canRecord && r.status === 'PENDING' && <Button variant="secondary" size="sm" onClick={() => setDecideId(a.id)}>Record decision</Button>}
              {canRecord && r.status === 'APPROVED' && r.scope === 'INITIAL_WORK' && <Button variant="secondary" size="sm" onClick={() => { setWithdrawId(a.id); setWithdrawReason('') }}>Withdraw</Button>}
              {canUpdate && r.status === 'APPROVED' && r.scope === 'ADDITIONAL_WORK' && <Button variant="secondary" size="sm" onClick={() => { setWorkItemApprovalId(a.id); setWorkItemDescription('') }}>Add as work item</Button>}
            </div>
          </div>
        )
      })}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New approval request" size="md"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={saving} onClick={create}>Create</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label="Scope (no SUBLET — not used)" value={form.scope} onChange={(e) => setForm({ ...form, scope: e.target.value })} options={[{ value: 'INITIAL_WORK', label: 'Initial work' }, { value: 'ADDITIONAL_WORK', label: 'Additional work' }]} />
          <Textarea label="Description (3–1000)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required rows={3} />
          <Input label="Estimated amount EGP (optional on create)" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
        </div>
      </Modal>
      <Modal open={!!decideId} onClose={() => setDecideId(null)} title="Record customer decision" size="md"
        footer={<><Button variant="secondary" onClick={() => setDecideId(null)}>Cancel</Button><Button disabled={saving} onClick={decide}>Submit</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label="Decision" value={decideForm.decision} onChange={(e) => setDecideForm({ ...decideForm, decision: e.target.value })} options={[{ value: 'APPROVED', label: 'Approve' }, { value: 'REJECTED', label: 'Reject' }]} />
          <Select label="Method" value={decideForm.method} onChange={(e) => setDecideForm({ ...decideForm, method: e.target.value })} options={['IN_PERSON', 'PHONE', 'MESSAGE', 'EMAIL', 'SIGNED_FORM'].map((m) => ({ value: m, label: m }))} />
          <Input label="Decided by (customer side)" value={decideForm.approvedByName} onChange={(e) => setDecideForm({ ...decideForm, approvedByName: e.target.value })} />
          <Input label="Amount EGP (required for approve)" type="number" value={decideForm.amount} onChange={(e) => setDecideForm({ ...decideForm, amount: e.target.value })} />
          <Input label="Notes (required for reject)" value={decideForm.notes} onChange={(e) => setDecideForm({ ...decideForm, notes: e.target.value })} />
        </div>
      </Modal>
      <Modal open={withdrawId !== null} onClose={() => setWithdrawId(null)} title="Withdraw approved initial scope" size="sm"
        footer={<><Button variant="secondary" onClick={() => setWithdrawId(null)}>Cancel</Button><Button onClick={withdraw}>Withdraw</Button></>}>
        <Textarea label="Reason (required)" value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} rows={3} required />
        <p className="text-xs text-slate-400 mt-1">If no other initial approval stays approved, the job closes automatically (RECEIVED → DELIVERED, no invoice).</p>
      </Modal>
      <Modal open={workItemApprovalId !== null} onClose={() => setWorkItemApprovalId(null)} title="Add as work item" size="md"
        footer={<><Button variant="secondary" onClick={() => setWorkItemApprovalId(null)}>Cancel</Button><Button onClick={addAsWorkItem}>Add</Button></>}>
        <Input label="Description (1–300 chars)" value={workItemDescription} onChange={(e) => setWorkItemDescription(e.target.value)} required />
      </Modal>
    </div>
  )
}

function WorkTab({ job, items, approvals, canUpdate, canLaborWrite, onReload, showToast }: {
  job: JobCard; items: WorkItem[]; approvals: Approval[]; canUpdate: boolean; canLaborWrite: boolean;
  onReload: () => void; showToast: (k: 'success' | 'error' | 'info', t: string, m?: string) => void;
}) {
  const approvedAdditional = approvals.filter((a) => {
    const r = a as unknown as { scope?: string; status?: string }
    return r.scope === 'ADDITIONAL_WORK' && r.status === 'APPROVED'
  })
  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ description: '', approvalId: '' })

  const add = async () => {
    try {
      await jobsV3.createWorkItem(job.id, { description: form.description, approvalId: form.approvalId } as never)
      showToast('success', 'Work item added', '')
      setAddOpen(false)
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const setStatus = async (id: string, status: string, description?: string) => {
    try {
      await jobsV3.updateWorkItem(job.id, id, { status, ...(description ? { description } : {}) } as never)
      showToast('success', `Work item ${status}`, '')
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {canUpdate && <div><Button size="sm" onClick={() => setAddOpen(true)}>Add from approved additional work</Button></div>}
      {items.length === 0 ? <p className="text-xs text-slate-400">No work items.</p> : items.map((w) => {
        const r = w as unknown as Record<string, string | boolean | undefined>
        return (
          <div key={w.id} className="border border-slate-100 rounded-lg p-3 flex items-center gap-3">
            <div className="flex-1">
              <p className="text-sm">{r.description as string}{r.isAdditionalWork ? ' (additional)' : ''}</p>
              <p className="text-xs text-slate-400 font-mono">{String(r.status)}</p>
            </div>
            {canLaborWrite && r.status === 'PENDING' && <Button variant="secondary" size="sm" onClick={() => setStatus(w.id, 'DONE')}>Mark done</Button>}
            {canUpdate && r.status === 'PENDING' && <Button variant="secondary" size="sm" onClick={() => setStatus(w.id, 'CANCELLED')}>Cancel</Button>}
          </div>
        )
      })}
      <Modal open={addOpen} onClose={() => setAddOpen(false)} title="Add work item (needs approvalId)" size="md"
        footer={<><Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button><Button onClick={add}>Add</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label="Approved additional-work approval (one approval → one item)" value={form.approvalId}
            onChange={(e) => setForm({ ...form, approvalId: e.target.value })}
            options={[{ value: '', label: 'Select approval' }, ...approvedAdditional.map((a) => ({ value: a.id, label: `${(a as unknown as { description?: string }).description ?? a.id}`.slice(0, 60) }))]} required />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
        </div>
      </Modal>
    </div>
  )
}

function LaborTab({ job, entries, workItems, canWrite, onReload, showToast }: {
  job: JobCard; entries: LaborEntry[]; workItems: WorkItem[]; canWrite: boolean;
  onReload: () => void; showToast: (k: 'success' | 'error' | 'info', t: string, m?: string) => void;
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ workItemId: '', workDate: new Date().toISOString().slice(0, 10), durationMinutes: '', description: '' })

  const log = async () => {
    try {
      await jobsV3.logLabor(job.id, {
        workDate: form.workDate,
        durationMinutes: Number(form.durationMinutes),
        ...(form.workItemId ? { workItemId: form.workItemId } : {}),
        ...(form.description ? { description: form.description } : {}),
      })
      showToast('success', 'Labor logged', '')
      setOpen(false)
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const [correctId, setCorrectId] = useState<string | null>(null)
  const [correctForm, setCorrectForm] = useState({ durationMinutes: '', changeReason: '' })
  const [voidId, setVoidId] = useState<string | null>(null)
  const [voidReason, setVoidReason] = useState('')

  const correct = async () => {
    if (!correctId) return
    const minutes = Number(correctForm.durationMinutes)
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      showToast('error', 'Invalid duration', 'Duration must be a whole number 1–1440.')
      return
    }
    if (correctForm.changeReason.trim().length < 3 || correctForm.changeReason.trim().length > 500) {
      showToast('error', 'Reason required', 'changeReason must be 3–500 characters.')
      return
    }
    try {
      await jobsV3.correctLabor(job.id, correctId, { durationMinutes: minutes, changeReason: correctForm.changeReason.trim() })
      showToast('success', 'Corrected', '')
      setCorrectId(null)
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const voidEntry = async () => {
    if (!voidId || voidReason.trim().length < 1) {
      showToast('error', 'Reason required', 'Voiding needs a reason.')
      return
    }
    try {
      await jobsV3.voidLabor(job.id, voidId, { reason: voidReason.trim() })
      showToast('success', 'Voided', '')
      setVoidId(null)
      setVoidReason('')
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {canWrite && <div><Button size="sm" onClick={() => setOpen(true)}>Log labor</Button></div>}
      {entries.length === 0 ? <p className="text-xs text-slate-400">No labor entries.</p> : entries.map((e) => {
        const r = e as unknown as Record<string, string | number | undefined>
        return (
          <div key={e.id} className="border border-slate-100 rounded-lg p-3">
            <p className="text-sm">{String(r.description ?? '—')} · {String(r.durationMinutes)} min · {r.workDate as string} · {String(r.status)}</p>
            <p className="text-xs text-slate-500">Amount: {formatMoney((e as unknown as { amount?: never }).amount as never)}{(e as unknown as { hourlyRate?: never }).hourlyRate ? ` · rate ${formatMoney((e as unknown as { hourlyRate?: never }).hourlyRate as never)}` : ' (rate hidden for your role)'}</p>
            {canWrite && r.status === 'ACTIVE' && (
              <div className="flex gap-2 mt-2">
                <Button variant="secondary" size="sm" onClick={() => { setCorrectId(e.id); setCorrectForm({ durationMinutes: '', changeReason: '' }) }}>Correct</Button>
                <Button variant="secondary" size="sm" onClick={() => { setVoidId(e.id); setVoidReason('') }}>Void</Button>
              </div>
            )}
          </div>
        )
      })}
      <Modal open={open} onClose={() => setOpen(false)} title="Log labor" size="md"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={log}>Log</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label="Work item (optional)" value={form.workItemId} onChange={(e) => setForm({ ...form, workItemId: e.target.value })}
            options={[{ value: '', label: '—' }, ...workItems.map((w) => ({ value: w.id, label: (w as unknown as { description?: string }).description ?? w.id }))]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Work date (YYYY-MM-DD)" value={form.workDate} onChange={(e) => setForm({ ...form, workDate: e.target.value })} required />
            <Input label="Minutes (1–1440)" type="number" value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} required />
          </div>
          <Input label="Description (≤500)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
      </Modal>
      <Modal open={correctId !== null} onClose={() => setCorrectId(null)} title="Correct labor entry" size="md"
        footer={<><Button variant="secondary" onClick={() => setCorrectId(null)}>Cancel</Button><Button onClick={correct}>Save correction</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Duration (minutes, 1–1440)" type="number" value={correctForm.durationMinutes} onChange={(e) => setCorrectForm({ ...correctForm, durationMinutes: e.target.value })} required />
          <Input label="Change reason (required, 3–500)" value={correctForm.changeReason} onChange={(e) => setCorrectForm({ ...correctForm, changeReason: e.target.value })} required />
        </div>
      </Modal>
      <Modal open={voidId !== null} onClose={() => setVoidId(null)} title="Void labor entry" size="sm"
        footer={<><Button variant="secondary" onClick={() => setVoidId(null)}>Cancel</Button><Button onClick={voidEntry}>Void entry</Button></>}>
        <Input label="Reason (required)" value={voidReason} onChange={(e) => setVoidReason(e.target.value)} required />
        <p className="text-xs text-slate-400 mt-1">A voided entry stays in the list with status VOIDED.</p>
      </Modal>
    </div>
  )
}

function PartsTab({ job, reservations, issues, canIssue, canReverse, onReload, showToast }: {
  job: JobCard; reservations: never[]; issues: never[]; canIssue: boolean; canReverse: boolean;
  onReload: () => void; showToast: (k: 'success' | 'error' | 'info', t: string, m?: string) => void;
}) {
  const [resOpen, setResOpen] = useState(false)
  const [resForm, setResForm] = useState({ partId: '', storeId: '', quantity: '1' })
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ partId: '', storeId: '', quantity: '1', workItemId: '', reservationId: '' })

  const reserve = async () => {
    try {
      await jobsV3.reserve(job.id, { partId: resForm.partId, storeId: resForm.storeId, quantity: Number(resForm.quantity) })
      showToast('success', 'Reserved', '')
      setResOpen(false)
      onReload()
    } catch (err) {
      showToast('error', 'Reserve failed', backendErrorMessage(err))
    }
  }

  const release = async (id: string) => {
    try {
      await jobsV3.releaseReservation(job.id, id)
      showToast('success', 'Released', '')
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const issue = async () => {
    try {
      await jobsV3.issue(job.id, {
        partId: issueForm.partId,
        storeId: issueForm.storeId,
        quantity: Number(issueForm.quantity),
        ...(issueForm.workItemId ? { workItemId: issueForm.workItemId } : {}),
        ...(issueForm.reservationId ? { reservationId: issueForm.reservationId } : {}),
      }, newIdempotencyKey())
      showToast('success', 'Issued', '')
      setIssueOpen(false)
      onReload()
    } catch (err) {
      showToast('error', 'Issue failed', backendErrorMessage(err))
    }
  }

  const [reverseId, setReverseId] = useState<string | null>(null)
  const [reverseForm, setReverseForm] = useState({ quantity: '', reason: '' })

  const reverse = async () => {
    if (!reverseId) return
    const qty = Number(reverseForm.quantity)
    if (!Number.isInteger(qty) || qty <= 0) {
      showToast('error', 'Invalid quantity', 'Quantity must be a whole number above 0.')
      return
    }
    if (reverseForm.reason.trim().length < 3 || reverseForm.reason.trim().length > 500) {
      showToast('error', 'Reason required', 'Reversal needs a reason (3–500 characters).')
      return
    }
    try {
      await jobsV3.reverseIssue(job.id, reverseId, { quantity: qty, reason: reverseForm.reason.trim() }, newIdempotencyKey())
      showToast('success', 'Reversed', 'Stock went back up.')
      setReverseId(null)
      setReverseForm({ quantity: '', reason: '' })
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Reservations ({reservations.length})</p>
          {canIssue && <Button variant="secondary" size="sm" onClick={() => setResOpen(true)}>Reserve</Button>}
        </div>
        {reservations.length === 0 ? <p className="text-xs text-slate-400">None.</p> : (reservations as unknown as { id: string; status?: string; quantity?: number }[]).map((x) => (
          <div key={x.id} className="border border-slate-100 rounded-lg p-2 text-sm flex items-center gap-2">
            <span className="font-mono text-xs">{x.id.slice(0, 8)}… · {x.status} · qty {x.quantity}</span>
            {x.status === 'ACTIVE' && <Button variant="secondary" size="sm" onClick={() => release(x.id)}>Release</Button>}
          </div>
        ))}
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold">Issues ({issues.length})</p>
          {canIssue && <Button variant="secondary" size="sm" onClick={() => setIssueOpen(true)}>Issue</Button>}
        </div>
        {issues.length === 0 ? <p className="text-xs text-slate-400">None.</p> : (issues as unknown as { id: string; status?: string; quantity?: number; unitPrice?: never; unitCost?: never }[]).map((x) => (
          <div key={x.id} className="border border-slate-100 rounded-lg p-2 text-sm">
            <p className="font-mono text-xs">{x.id.slice(0, 8)}… · {x.status} · qty {x.quantity}</p>
            <p className="text-xs text-slate-500">Price: {x.unitPrice ? formatMoney(x.unitPrice) : '(hidden for your role)'}</p>
            {canReverse && <Button variant="secondary" size="sm" onClick={() => { setReverseId(x.id); setReverseForm({ quantity: '', reason: '' }) }} className="mt-1">Reverse</Button>}
          </div>
        ))}
      </div>
      <Modal open={resOpen} onClose={() => setResOpen(false)} title="Reserve part" size="md"
        footer={<><Button variant="secondary" onClick={() => setResOpen(false)}>Cancel</Button><Button onClick={reserve}>Reserve</Button></>}>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Part ID" value={resForm.partId} onChange={(e) => setResForm({ ...resForm, partId: e.target.value })} required />
          <Input label="Store ID" value={resForm.storeId} onChange={(e) => setResForm({ ...resForm, storeId: e.target.value })} required />
          <Input label="Qty" type="number" value={resForm.quantity} onChange={(e) => setResForm({ ...resForm, quantity: e.target.value })} required />
        </div>
      </Modal>
      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title="Issue part (idempotent)" size="md"
        footer={<><Button variant="secondary" onClick={() => setIssueOpen(false)}>Cancel</Button><Button onClick={issue}>Issue</Button></>}>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Part ID" value={issueForm.partId} onChange={(e) => setIssueForm({ ...issueForm, partId: e.target.value })} required />
          <Input label="Store ID" value={issueForm.storeId} onChange={(e) => setIssueForm({ ...issueForm, storeId: e.target.value })} required />
          <Input label="Qty" type="number" value={issueForm.quantity} onChange={(e) => setIssueForm({ ...issueForm, quantity: e.target.value })} required />
          <Input label="Work item ID (opt)" value={issueForm.workItemId} onChange={(e) => setIssueForm({ ...issueForm, workItemId: e.target.value })} />
          <Input label="Reservation ID (opt)" value={issueForm.reservationId} onChange={(e) => setIssueForm({ ...issueForm, reservationId: e.target.value })} />
        </div>
      </Modal>
      <Modal open={reverseId !== null} onClose={() => setReverseId(null)} title="Reverse part issue (idempotent)" size="md"
        footer={<><Button variant="secondary" onClick={() => setReverseId(null)}>Cancel</Button><Button onClick={reverse}>Reverse</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label="Quantity (≤ still issued)" type="number" value={reverseForm.quantity} onChange={(e) => setReverseForm({ ...reverseForm, quantity: e.target.value })} required />
          <Input label="Reason (required, 3–500)" value={reverseForm.reason} onChange={(e) => setReverseForm({ ...reverseForm, reason: e.target.value })} required />
          <p className="text-xs text-slate-400">Stock goes back up. Only while the job is IN_PROGRESS.</p>
        </div>
      </Modal>
    </div>
  )
}

function QualityTab({ job, checks, canPerform, onReload, showToast }: {
  job: JobCard; checks: never[]; canPerform: boolean;
  onReload: () => void; showToast: (k: 'success' | 'error' | 'info', t: string, m?: string) => void;
}) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ result: 'PASSED', notes: '' })

  const submit = async () => {
    if (form.result === 'FAILED' && !form.notes.trim()) {
      showToast('error', 'Notes required', 'FAILED needs notes (the reason the technician sees).')
      return
    }
    try {
      await jobsV3.recordQuality(job.id, { result: form.result, ...(form.notes ? { notes: form.notes } : {}) } as never)
      showToast('success', `Quality ${form.result}`, form.result === 'PASSED' ? 'Job → READY, draft invoice created.' : 'Job → IN_PROGRESS for rework.')
      setOpen(false)
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {canPerform && <div><Button size="sm" onClick={() => setOpen(true)}>Record quality check</Button></div>}
      {checks.length === 0 ? <p className="text-xs text-slate-400">No quality checks.</p> : (checks as unknown as { id: string; result: string; notes?: string; performedAt: string }[]).map((c) => (
        <div key={c.id} className="border border-slate-100 rounded-lg p-3 text-sm">
          <p className="font-medium">{c.result} · {c.performedAt}</p>
          {c.notes && <p className="text-xs text-slate-500">{c.notes}</p>}
        </div>
      ))}
      <Modal open={open} onClose={() => setOpen(false)} title="Record quality result" size="md"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button onClick={submit}>Submit</Button></>}>
        <div className="flex flex-col gap-3">
          <Select label="Result (PASSED → READY, FAILED → IN_PROGRESS)" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} options={[{ value: 'PASSED', label: 'Passed' }, { value: 'FAILED', label: 'Failed' }]} />
          <Textarea label="Notes (required for FAILED)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
      </Modal>
    </div>
  )
}

function PhotosTab({ job, photos, urls, setUrls, canUpload, onReload, showToast }: {
  job: JobCard; photos: { id: string }[]; urls: Record<string, string>; setUrls: (v: Record<string, string>) => void;
  canUpload: boolean; onReload: () => void; showToast: (k: 'success' | 'error' | 'info', t: string, m?: string) => void;
}) {
  const loadUrl = async (id: string) => {
    try {
      const { url } = await attachmentsV3.authorizeDownload(id)
      const blobUrl = await fetchAuthenticatedBlob(url)
      setUrls({ ...urls, [id]: blobUrl })
    } catch (err) {
      showToast('error', 'Download failed', backendErrorMessage(err))
    }
  }

  const uploadAndLink = async (file: File) => {
    try {
      const att = await attachmentsV3.upload(file, 'JOB_PHOTO')
      await jobsV3.linkAttachments(job.id, [att.id])
      showToast('success', 'Photo linked', file.name)
      onReload()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {canUpload && (
        <div>
          <label className="text-sm font-medium">Upload + link JOB_PHOTO</label>
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple
            onChange={(e) => { Array.from(e.target.files ?? []).forEach(uploadAndLink); e.target.value = '' }} className="mt-1 text-sm" />
        </div>
      )}
      {photos.length === 0 ? <p className="text-xs text-slate-400">No photos.</p> : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map((p) => (
            <div key={p.id} className="border border-slate-100 rounded-lg p-2">
              <p className="text-xs font-mono break-all">{p.id.slice(0, 8)}…</p>
              {urls[p.id] ? (
                // eslint-disable-next-line jsx-a11y/alt-text
                <img src={urls[p.id]} className="mt-1 rounded w-full h-32 object-cover" />
              ) : (
                <Button variant="secondary" size="sm" onClick={() => loadUrl(p.id)} className="mt-2">Show (blob URL)</Button>
              )}
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">Files need Bearer header — never use {'<img src={signedUrl}>'} directly; use the blob approach.</p>
    </div>
  )
}

function JobInvoiceTab({ job, invoices, canRead, navigate }: {
  job: JobCard
  invoices: Invoice[]
  canRead: boolean
  navigate: (to: string) => void
}) {
  const [summary, setSummary] = useState<unknown>(null)
  const [summaryState, setSummaryState] = useState<'idle' | 'loading' | 'error'>('idle')

  useEffect(() => {
    if (!canRead) return
    let cancelled = false
    setSummaryState('loading')
    invoicesV3.summary(job.id).then(
      (s) => {
        if (!cancelled) {
          setSummary(s)
          setSummaryState('idle')
        }
      },
      () => {
        if (!cancelled) setSummaryState('error')
      },
    )
    return () => {
      cancelled = true
    }
  }, [job.id, canRead])

  if (!canRead) return <p className="text-xs text-slate-400">You do not have invoices.read permission.</p>

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-semibold mb-2">Invoices on this job ({invoices.length})</p>
        {invoices.length === 0 ? (
          <p className="text-xs text-slate-400">None yet — a draft is created when the job passes quality check.</p>
        ) : (
          invoices.map((inv) => {
            const r = inv as unknown as { invoiceNumber?: string; status?: string; totals?: { total?: unknown } }
            return (
              <div key={inv.id} className="border border-slate-100 rounded-lg p-3 flex items-center gap-3 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-mono" dir="ltr">{r.invoiceNumber ?? `${inv.id.slice(0, 8)}… (draft)`}</p>
                  <p className="text-xs text-slate-500">
                    <Badge variant={badgeVariantFor(r.status ?? '')} /> total {formatMoney((r.totals?.total as never) ?? undefined as never)}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => navigate(`/invoices/${inv.id}`)}>Open invoice</Button>
              </div>
            )
          })
        )}
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">Live invoice preview (server-computed)</p>
        {summaryState === 'loading' && <LoadingState label="Loading summary…" />}
        {summaryState === 'error' && <p className="text-xs text-slate-400">Summary unavailable (e.g. job has no billable scope yet).</p>}
        {summaryState === 'idle' && summary !== null && (
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(summary as Record<string, unknown>).map(([k, v]) => (
              <div key={k} className="bg-slate-50 rounded-lg p-2">
                <p className="text-xs text-slate-400 font-mono">{k}</p>
                <p className="text-xs font-mono break-all">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
        Deliver is available when the invoice is ISSUED or PAID — the backend answers 409 INVOICE_REQUIRED otherwise.
      </p>
    </div>
  )
}

// Keep vehicle import referenced (create form resolves UUIDs via Vehicles page)
export { vehiclesV3 }
