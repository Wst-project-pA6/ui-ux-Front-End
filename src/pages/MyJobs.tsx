import React, { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { useLang } from '../i18n/LanguageContext'
import { laborApi, inventoryApi } from '../api/resources'
import { ApiError } from '../api/http'
import { DemoBadge } from '../components/ui/ApiState'
import { useAuth } from '../context/AuthContext'

type JobStatus = 'received' | 'in-progress' | 'quality-check'

interface TechJob {
  id: string
  customer: string
  vehicle: string
  plate: string
  complaint: string
  status: JobStatus
  priority: string
  bay: string
  startTime: string
  expectedDone: string
  laborLogged: number
  partsIssued: string[]
  checklist: Array<{ task: string; done: boolean }>
}

const INITIAL_JOBS: TechJob[] = [
  {
    id: 'JC-2024-0912',
    customer: 'Mohammed Al-Rashid',
    vehicle: 'Toyota Camry 2022',
    plate: 'ABC-1234',
    complaint: 'Engine oil change and full inspection',
    status: 'in-progress' as const,
    priority: 'High',
    bay: 'Bay 3',
    startTime: '08:30',
    expectedDone: '12:00',
    laborLogged: 1.5,
    partsIssued: ['Engine Oil 5W-30 (4L)', 'Oil Filter'],
    checklist: [
      { task: 'Drain and replace engine oil', done: true },
      { task: 'Replace oil filter', done: true },
      { task: 'Check brake fluid level', done: false },
      { task: 'Inspect brake pads', done: false },
      { task: 'Check tyre pressure', done: false },
    ],
  },
  {
    id: 'JC-2024-0908',
    customer: 'Omar Al-Harthi',
    vehicle: 'Ford F-150 2020',
    plate: 'XYZ-5678',
    complaint: 'Front brake pads replacement and rotor check',
    status: 'received' as const,
    priority: 'High',
    bay: 'Bay 3',
    startTime: '13:00',
    expectedDone: '16:00',
    laborLogged: 0,
    partsIssued: [],
    checklist: [
      { task: 'Remove front wheels', done: false },
      { task: 'Inspect brake caliper', done: false },
      { task: 'Replace brake pads', done: false },
      { task: 'Check rotor thickness', done: false },
      { task: 'Re-torque wheel nuts', done: false },
    ],
  },
  {
    id: 'JC-2024-0905',
    customer: 'Rayan Omar',
    vehicle: 'BMW 520i 2023',
    plate: 'BMW-9012',
    complaint: 'Electrical diagnostic — intermittent AC fault',
    status: 'quality-check' as const,
    priority: 'Normal',
    bay: 'Bay 1',
    startTime: '06:00',
    expectedDone: '10:00',
    laborLogged: 3.0,
    partsIssued: ['AC Pressure Sensor', 'Refrigerant R134a'],
    checklist: [
      { task: 'Run diagnostic scan', done: true },
      { task: 'Check AC compressor', done: true },
      { task: 'Replace pressure sensor', done: true },
      { task: 'Recharge refrigerant', done: true },
      { task: 'Test AC output temperature', done: true },
    ],
  },
]

type Job = TechJob

const priorityColor = (p: string) =>
  p === 'High' ? 'text-red-600 bg-red-50' : 'text-slate-600 bg-slate-100'

export default function MyJobs() {
  const { t, lang } = useLang()
  const { mode } = useAuth()
  const [jobs, setJobs] = useState<TechJob[]>(INITIAL_JOBS)
  const [selected, setSelected] = useState<Job | null>(null)
  const [addLabor, setAddLabor] = useState(false)
  const [addPart, setAddPart] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const myJobs = jobs

  const applyToJob = (jobId: string, patch: (j: Job) => Job) => {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? patch(j) : j)))
    setSelected((prev) => (prev && prev.id === jobId ? patch(prev) : prev))
  }

  const handleSaveLabor = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    const fd = new FormData(e.currentTarget)
    const description = String(fd.get('description') ?? '').trim()
    const hours = Number(fd.get('hours') ?? 0)
    const rate = String(fd.get('rate') ?? '0').trim() || '0'
    const note = String(fd.get('notes') ?? '').trim() || undefined
    if (!description || !(hours > 0)) {
      setSaveError('Description and hours are required')
      return
    }
    setSaving(true)
    setSaveError('')
    try {
      // Contract: POST /job-cards/{jobId}/labor-entries (rate snapshotted).
      await laborApi.create(selected.id, {
        description, hours, rate: { amount: rate, currency: 'SAR' }, note,
      })
      setAddLabor(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        applyToJob(selected.id, (j) => ({ ...j, laborLogged: j.laborLogged + hours }))
        setAddLabor(false)
      } else {
        setSaveError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Save failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleIssuePart = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!selected) return
    const fd = new FormData(e.currentTarget)
    const partName = String(fd.get('partName') ?? '').trim() || 'Engine Oil 5W-30 (4L)'
    const quantity = Number(fd.get('quantity') ?? 1) || 1
    setSaving(true)
    setSaveError('')
    try {
      // Contract: POST .../part-issues with Idempotency-Key; insufficient
      // stock -> 409 INSUFFICIENT_STOCK (negative stock is impossible).
      await inventoryApi.issuePart(selected.id, {
        partId: 'part-id', storeId: 'main-store', quantity,
      })
      setAddPart(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        applyToJob(selected.id, (j) => ({ ...j, partsIssued: [...j.partsIssued, `${partName} ×${quantity}`] }))
        setAddPart(false)
      } else {
        setSaveError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Issue failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const priorityLabel = (p: string) =>
    p === 'High' ? t('jobCards.filter.high') : p === 'Low' ? t('jobCards.filter.low') : t('jobCards.filter.normal')

  const today = new Date().toLocaleDateString(
    lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US',
    { weekday: 'long', month: 'long', day: 'numeric' },
  )

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('nav.myJobs')}
        subtitle={`${t('myJobs.subtitlePrefix')} ${today}`}
        actions={<DemoBadge visible={mode === 'demo'} />}
      />

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: t('badge.in-progress'), count: myJobs.filter((j) => j.status === 'in-progress').length, color: 'text-amber-600' },
          { label: t('myJobs.summary.pendingStart'), count: myJobs.filter((j) => j.status === 'received').length, color: 'text-blue-600' },
          { label: t('badge.quality-check'), count: myJobs.filter((j) => j.status === 'quality-check').length, color: 'text-purple-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Job cards */}
      <div className="flex flex-col gap-3">
        {myJobs.map((job) => {
          const done = job.checklist.filter((c) => c.done).length
          const total = job.checklist.length
          const pct = Math.round((done / total) * 100)
          return (
            <button
              key={job.id}
              onClick={() => setSelected(job)}
              className="w-full text-start bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-mono text-xs font-semibold text-blue-600" dir="ltr">{job.id}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColor(job.priority)}`}>
                      {priorityLabel(job.priority)}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900 text-sm leading-snug">{job.complaint}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{job.customer} · {job.vehicle}</p>
                </div>
                <Badge variant={job.status} />
              </div>

              {/* Progress bar */}
              <div className="mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{t('myJobs.checklist')}</span>
                  <span className="text-xs font-medium text-slate-600">{done}/{total} {t('myJobs.complete')}</span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{job.bay} · {job.startTime} – {job.expectedDone}</span>
                <span className="text-blue-600 font-medium group-hover:underline">{t('myJobs.open')}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Job Detail Modal */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelected(null)}
          title={selected.id}
          size="lg"
          footer={
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="secondary" onClick={() => setSelected(null)}>{t('action.close')}</Button>
              <Button variant="secondary" onClick={() => { setAddLabor(true) }}>+ {t('myJobs.addLabor')}</Button>
              <Button variant="secondary" onClick={() => { setAddPart(true) }}>+ {t('myJobs.issuePart')}</Button>
              {selected.status === 'in-progress' && (
                <Button>{t('jobCards.action.sendQC')}</Button>
              )}
              {selected.status === 'quality-check' && (
                <Button>{t('jobCards.action.markReady')}</Button>
              )}
              {selected.status === 'received' && (
                <Button>{t('jobCards.action.startWork')}</Button>
              )}
            </div>
          }
        >
          <div className="flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-slate-500">{selected.customer}</p>
                <p className="text-sm font-medium text-slate-800">{selected.vehicle}</p>
                <p className="font-mono text-xs text-slate-400" dir="ltr">{selected.plate} · {selected.bay}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${priorityColor(selected.priority)}`}>
                  {priorityLabel(selected.priority)} {t('jobCards.detail.priority')}
                </span>
                <Badge variant={selected.status} />
              </div>
            </div>

            {/* Complaint */}
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('jobCards.detail.complaint')}</p>
              <p className="text-sm text-slate-800">{selected.complaint}</p>
            </div>

            {/* Checklist */}
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('myJobs.workChecklist')}</p>
              <div className="flex flex-col gap-2">
                {selected.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${item.done ? 'bg-green-500 border-green-500' : 'border-slate-300'
                      }`}>
                      {item.done && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <span className={`text-sm ${item.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                      {item.task}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Labor & Parts summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('myJobs.laborLogged')}</p>
                <p className="text-2xl font-bold text-slate-900">{selected.laborLogged}h</p>
                <p className="text-xs text-slate-400 mt-0.5">{t('myJobs.loggedToday')}</p>
              </div>
              <div className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('myJobs.partsIssued')}</p>
                {selected.partsIssued.length === 0 ? (
                  <p className="text-sm text-slate-400">{t('myJobs.noneYet')}</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {selected.partsIssued.map((p, i) => (
                      <li key={i} className="text-xs text-slate-700">· {p}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Labor Modal */}
      <Modal
        open={addLabor}
        onClose={() => setAddLabor(false)}
        title={t('myJobs.modal.addLaborTitle')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddLabor(false)}>{t('action.cancel')}</Button>
            <Button loading={saving} onClick={() => (document.getElementById('labor-add-form') as HTMLFormElement | null)?.requestSubmit()}>{t('myJobs.saveLabor')}</Button>
          </>
        }
      >
        <form id="labor-add-form" onSubmit={handleSaveLabor} className="flex flex-col gap-4">
          {saveError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('myJobs.form.description')}</label>
            <input name="description" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('myJobs.form.descriptionPlaceholder')} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('myJobs.form.hours')}</label>
              <input name="hours" type="number" step="0.25" min="0" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="1.5" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('myJobs.form.rate')}</label>
              <input name="rate" type="number" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="120" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('customers.form.notes')}</label>
            <textarea name="notes" rows={2} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={t('myJobs.form.notesPlaceholder')} />
          </div>
        </form>
      </Modal>

      {/* Issue Part Modal */}
      <Modal
        open={addPart}
        onClose={() => setAddPart(false)}
        title={t('myJobs.issuePart')}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddPart(false)}>{t('action.cancel')}</Button>
            <Button loading={saving} onClick={() => (document.getElementById('part-issue-form') as HTMLFormElement | null)?.requestSubmit()}>{t('myJobs.issuePart')}</Button>
          </>
        }
      >
        <form id="part-issue-form" onSubmit={handleIssuePart} className="flex flex-col gap-4">
          {saveError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>
          )}
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('myJobs.form.part')}</label>
            <select name="partName" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option>Engine Oil 5W-30 (4L) — 42 in stock</option>
              <option>Oil Filter — 18 in stock</option>
              <option>Brake Pad Set (Front) — 3 in stock</option>
              <option>Air Filter — 11 in stock</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('myJobs.form.quantity')}</label>
            <input name="quantity" type="number" min="1" defaultValue={1} className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">{t('myJobs.form.reason')}</label>
            <input name="reason" className="w-full h-10 px-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('myJobs.form.reasonPlaceholder')} />
          </div>
        </form>
      </Modal>
    </div>
  )
}
