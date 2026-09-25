import { useCallback, useEffect, useState } from 'react'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { trainingV3, type TrainingSession, type Assessment, type Certificate } from '../api/v6/training'
import { LoadingState, EmptyState, ErrorState } from '../components/common/ApiStates'
import { backendErrorMessage } from '../api/v3/types'

type Tab = 'sessions' | 'attendance' | 'assessments' | 'progress' | 'certificates'

/**
 * Student self-service — all data resolved from the backend identity
 * (GET /auth/me → studentId). Students only ever see their own records;
 * the server enforces this (other ids → 404).
 */
export default function MyTraining() {
  const { t } = useLang()
  const { me } = useAuth()
  const { showToast } = useToast()
  const [tab, setTab] = useState<Tab>('sessions')

  const studentId = (me as unknown as { studentId?: string })?.studentId ?? null
  const [student, setStudent] = useState<{ displayName?: string; studentNumber?: string } | null>(null)

  useEffect(() => {
    if (!studentId) return
    trainingV3.student(studentId).then(
      (s) => setStudent(s as unknown as { displayName?: string; studentNumber?: string }),
      (err) => showToast('error', 'Failed to load student record', backendErrorMessage(err)),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  if (!studentId) {
    return (
      <div className="space-y-5">
        <PageHeader title={t('myTraining.title')} subtitle={t('myTraining.subtitle')} />
        <EmptyState title={t('myTraining.noRecord')} hint={t('myTraining.noRecordHint')} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title={t('myTraining.title')}
        subtitle={`${student?.displayName ?? '…'} · ${student?.studentNumber ?? ''}`}
      />
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {(
          [
            { id: 'sessions', label: t('myTraining.tab.sessions') },
            { id: 'attendance', label: t('myTraining.tab.attendance') },
            { id: 'assessments', label: t('myTraining.tab.assessments') },
            { id: 'progress', label: t('myTraining.tab.progress') },
            { id: 'certificates', label: t('myTraining.tab.certificates') },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap ${tab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'sessions' && <MySessions />}
      {tab === 'attendance' && <MyAttendance studentId={studentId} />}
      {tab === 'assessments' && <MyAssessments studentId={studentId} />}
      {tab === 'progress' && <MyProgress studentId={studentId} />}
      {tab === 'certificates' && <MyCertificates studentId={studentId} />}
    </div>
  )
}

function MySessions() {
  const { t } = useLang()
  const [items, setItems] = useState<TrainingSession[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.sessions({ page: 1, pageSize: 50, sort: 'startsAt' })
      setItems(res.items)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') return <LoadingState label={t('dash.loading')} />
  if (state === 'error') return <ErrorState error={error} onRetry={load} />
  if (items.length === 0) return <EmptyState title={t('myTraining.tab.sessions')} />
  return (
    <div className="flex flex-col gap-3">
      {items.map((s) => {
        const r = s as unknown as { title?: string; startsAt?: string; endsAt?: string; status?: string }
        return (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{r.title}</p>
                <p className="text-xs text-slate-400 mt-0.5">{r.startsAt} → {r.endsAt}</p>
              </div>
              <Badge variant={badgeVariantFor(r.status ?? '')} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function MyAttendance({ studentId }: { studentId: string }) {
  const { t } = useLang()
  const [items, setItems] = useState<never[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.attendanceRecords({ studentId, page: 1, pageSize: 100, sort: '-occurredAt' })
      setItems(res.items as never[])
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') return <LoadingState label={t('dash.loading')} />
  if (state === 'error') return <ErrorState error={error} onRetry={load} />
  if (items.length === 0) return <EmptyState title={t('myTraining.tab.attendance')} />
  return (
    <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-50">
      {(items as unknown as { id: string; status?: string; occurredAt?: string; sessionId?: string }[]).map((a) => (
        <div key={a.id} className="px-4 py-3 flex items-center gap-3">
          <p className="text-sm flex-1 font-mono">{a.occurredAt}</p>
          <Badge variant={badgeVariantFor(a.status ?? '')} />
        </div>
      ))}
    </div>
  )
}

function MyAssessments({ studentId }: { studentId: string }) {
  const { t } = useLang()
  const [items, setItems] = useState<Assessment[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.assessments({ studentId, page: 1, pageSize: 100 })
      setItems(res.items)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') return <LoadingState label={t('dash.loading')} />
  if (state === 'error') return <ErrorState error={error} onRetry={load} />
  if (items.length === 0) return <EmptyState title={t('assess.noItems')} />
  return (
    <div className="flex flex-col gap-3">
      {items.map((a) => {
        const r = a as unknown as { result?: string; signOffStatus?: string; mentorNote?: string; timeOnTaskMinutes?: number; countsTowardCompletion?: boolean }
        return (
          <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariantFor(r.result ?? '')} />
              <Badge variant={badgeVariantFor(r.signOffStatus ?? '')} />
              <span className="text-xs text-slate-400 ms-auto">{r.timeOnTaskMinutes} min{r.countsTowardCompletion ? ' · counts toward completion' : ''}</span>
            </div>
            {r.mentorNote && <p className="text-sm text-slate-600 mt-2">{r.mentorNote}</p>}
          </div>
        )
      })}
    </div>
  )
}

function MyProgress({ studentId }: { studentId: string }) {
  const { t } = useLang()
  const { showToast } = useToast()
  const [courses, setCourses] = useState<{ id: string; name?: { en?: string; ar?: string } }[]>([])
  const [courseId, setCourseId] = useState('')
  const [coverage, setCoverage] = useState<{ overallPercent?: string; competencies?: { competencyId?: string; percent?: string }[] } | null>(null)
  const [eligibility, setEligibility] = useState<Record<string, unknown> | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    trainingV3.courses({ page: 1, pageSize: 100 }).then(
      (r) => setCourses((r.items ?? []) as unknown as { id: string; name?: { en?: string; ar?: string } }[]),
      () => {},
    )
  }, [])

  const check = async () => {
    if (!courseId || busy) return
    setBusy(true)
    try {
      const [c, e] = await Promise.all([
        trainingV3.coverage(studentId, courseId),
        trainingV3.eligibility(studentId, courseId),
      ])
      setCoverage(c as unknown as { overallPercent?: string; competencies?: { competencyId?: string; percent?: string }[] })
      setEligibility(e as unknown as Record<string, unknown>)
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
      <div className="flex gap-2">
        <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="flex-1 h-9 px-3 border rounded-lg text-sm">
          <option value="">{t('f.selectCourse')}</option>
          {courses.map((c) => (
            <option key={c.id} value={c.id}>{c.name?.en ?? c.id}</option>
          ))}
        </select>
        <Button size="sm" disabled={busy} onClick={check}>{busy ? t('myTraining.checking') : t('myTraining.check')}</Button>
      </div>
      {coverage && (
        <div>
          <p className="text-sm font-semibold">Coverage: {coverage.overallPercent}%</p>
          {(coverage.competencies ?? []).map((c, i) => (
            <div key={i} className="mt-2">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-mono">{c.competencyId?.slice(0, 8)}…</span>
                <span className="font-bold">{c.percent}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Number(c.percent ?? 0)}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
      {eligibility && (
        <div className="bg-slate-50 rounded-lg p-3">
          <p className="text-sm font-semibold">{(eligibility.eligible as boolean) ? t('myTraining.eligible') : t('myTraining.notEligible')}</p>
          {Object.entries(eligibility).map(([k, v]) => (
            <p key={k} className="text-xs font-mono break-all">{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function MyCertificates({ studentId }: { studentId: string }) {
  const { t } = useLang()
  const [items, setItems] = useState<Certificate[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.certificates({ studentId, page: 1, pageSize: 50 })
      setItems(res.items)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [studentId])

  useEffect(() => {
    load()
  }, [load])

  const print = () => window.print()

  if (state === 'loading') return <LoadingState label={t('dash.loading')} />
  if (state === 'error') return <ErrorState error={error} onRetry={load} />
  if (items.length === 0) return <EmptyState title={t('myTraining.noCertificates')} hint={t('myTraining.noCertificatesHint')} />
  return (
    <div className="flex flex-col gap-3">
      {items.map((c) => {
        const r = c as unknown as { certificateNumber?: string; status?: string; issuedAt?: string }
        return (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-5 text-center">
            <p className="font-mono font-bold" dir="ltr">{r.certificateNumber}</p>
            <p className="text-xs text-slate-400 mt-1">{r.issuedAt}</p>
            <p className="mt-2"><Badge variant={badgeVariantFor(r.status ?? '')} /></p>
            <Button variant="secondary" size="sm" onClick={print} className="mt-3">{t('myTraining.print')}</Button>
          </div>
        )
      })}
    </div>
  )
}
