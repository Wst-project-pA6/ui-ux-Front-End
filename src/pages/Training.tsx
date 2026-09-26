import { useCallback, useEffect, useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { trainingV3, newIdempotencyKey, type TrainingSession, type Course, type TrainingGroup, type Student, type Certificate } from '../api/v6/training'
import { usersV3 } from '../api/v4/management'
import { baysV3 } from '../api/v3/workshop'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

type Tab = 'sessions' | 'courses' | 'groups' | 'students' | 'mentors' | 'terms' | 'certificates'
const PAGE_SIZE = 20

function locName(name: { en?: string; ar?: string } | undefined, lang: string): string {
  if (!name) return '—'
  return (lang === 'ar' ? name.ar || name.en : name.en || name.ar) ?? '—'
}

export default function Training() {
  const { t } = useLang()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PERMS.trainingManage)
  const [tab, setTab] = useState<Tab>('sessions')

  const tabs: { key: Tab; label: string }[] = [
    { key: 'sessions', label: t('training.tab.sessions') },
    { key: 'courses', label: t('training.tab.courses') },
    { key: 'groups', label: t('training.tab.groups') },
    { key: 'students', label: t('training.tab.students') },
    { key: 'mentors', label: t('training.tab.mentors') },
    { key: 'terms', label: t('training.tab.terms') },
    { key: 'certificates', label: t('training.tab.certificates') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title={t('training.title')} subtitle={t('training.subtitleFinal')} />
      <div className="flex border-b border-slate-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'sessions' && <SessionsTab canManage={canManage} />}
      {tab === 'courses' && <CoursesTab canManage={canManage} />}
      {tab === 'groups' && <GroupsTab canManage={canManage} />}
      {tab === 'students' && <StudentsTab canManage={canManage} />}
      {tab === 'mentors' && <MentorsTab canManage={canManage} />}
      {tab === 'terms' && <TermsTab canManage={canManage} />}
      {tab === 'certificates' && <CertificatesTab />}
    </div>
  )
}

// ── Sessions ─────────────────────────────────────────────────────────────

function SessionsTab({ canManage }: { canManage: boolean }) {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canOverride = hasPermission(PERMS.scheduleOverride)
  const canAttend = hasPermission(PERMS.trainingAttendance)
  const canPublish = hasPermission(PERMS.trainingPublish) || canManage

  const [items, setItems] = useState<TrainingSession[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)

  const [detail, setDetail] = useState<TrainingSession | null>(null)
  const [conflicts, setConflicts] = useState<{ conflictKey?: string; kind?: string; message?: string; overridable?: boolean }[]>([])
  const [busy, setBusy] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<TrainingSession | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [groups, setGroups] = useState<TrainingGroup[]>([])
  const [bays, setBays] = useState<{ id: string; name: string }[]>([])
  const [mentors, setMentors] = useState<{ id: string; displayName?: string }[]>([])
  const [form, setForm] = useState({ title: '', courseId: '', groupIds: [] as string[], bayId: '', mentorId: '', capacity: '', startsAt: '', endsAt: '' })
  const [saveError, setSaveError] = useState<unknown>(null)

  const [attendOpen, setAttendOpen] = useState(false)
  const [attendRows, setAttendRows] = useState<{ studentId: string; status: string; note: string }[]>([])
  const [transitionTarget, setTransitionTarget] = useState<{ id: string; to: 'PUBLISHED' | 'COMPLETED' | 'CANCELLED' } | null>(null)
  const [transitionReason, setTransitionReason] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.sessions({ page, pageSize: PAGE_SIZE, status: status || undefined })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, status])

  useEffect(() => {
    load()
  }, [load])

  const loadPickers = useCallback(async () => {
    try {
      const [c, g, b, m] = await Promise.all([
        trainingV3.courses({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        trainingV3.groups({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        baysV3.list({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        trainingV3.mentors({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      ])
      setCourses((c as { items: Course[] }).items ?? [])
      setGroups((g as { items: TrainingGroup[] }).items ?? [])
      setBays((((b as { items: never[] }).items ?? []) as unknown as { id: string; name: string }[]))
      setMentors((((m as { items: never[] }).items ?? []) as unknown as { id: string; displayName?: string }[]))
    } catch {
      /* optional */
    }
  }, [])

  useEffect(() => {
    loadPickers()
  }, [loadPickers])

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', courseId: '', groupIds: [], bayId: '', mentorId: '', capacity: '', startsAt: '', endsAt: '' })
    setSaveError(null)
    setCreateOpen(true)
  }

  const openEdit = (s: TrainingSession) => {
    const r = s as unknown as Record<string, string | string[] | number | undefined>
    setEditing(s)
    setForm({
      title: (r.title as string) ?? '',
      courseId: (r.courseId as string) ?? '',
      groupIds: ((r.groupIds as string[]) ?? []),
      bayId: (r.bayId as string) ?? '',
      mentorId: (r.mentorId as string) ?? '',
      capacity: String(r.capacity ?? ''),
      startsAt: (r.startsAt as string) ?? '',
      endsAt: (r.endsAt as string) ?? '',
    })
    setSaveError(null)
    setCreateOpen(true)
  }

  const save = async () => {
    if (busy) return
    if (!form.title.trim() || !form.courseId || !form.bayId || !form.mentorId || !form.startsAt || !form.endsAt) {
      setSaveError(new ApiError({ message: 'Title, course, bay, mentor, start and end are required.', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    const groupIds = form.groupIds
    if (groupIds.length === 0) {
      setSaveError(new ApiError({ message: 'At least one group is required (groupIds minItems 1).', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    const capacity = Number(form.capacity)
    if (!form.capacity || !Number.isInteger(capacity) || capacity < 1) {
      setSaveError(new ApiError({ message: 'Capacity is required (whole number ≥ 1).', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    const startsAt = new Date(form.startsAt)
    const endsAt = new Date(form.endsAt)
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || startsAt >= endsAt) {
      setSaveError(new ApiError({ message: 'End must be after start (startsAt < endsAt).', code: 'BAD_REQUEST', status: 400 }))
      return
    }
    setBusy(true)
    setSaveError(null)
    try {
      const payload = {
        title: form.title.trim(),
        courseId: form.courseId,
        groupIds,
        bayId: form.bayId,
        mentorId: form.mentorId,
        capacity,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      }
      if (editing) {
        await trainingV3.updateSession(editing.id, {
          version: (editing as unknown as { version?: number }).version,
          ...payload,
        } as never)
        showToast('success', 'Session updated', '')
      } else {
        await trainingV3.createSession(payload as never)
        showToast('success', 'Session created', '')
      }
      setCreateOpen(false)
      load()
    } catch (err) {
      setSaveError(err)
    } finally {
      setBusy(false)
    }
  }

  const checkConflicts = async (id: string) => {
    setBusy(true)
    try {
      const res = await trainingV3.conflictCheck(id)
      const list = ((res as { conflicts?: never[] }).conflicts ?? []) as never[]
      setConflicts(list as { conflictKey?: string; kind?: string; message?: string; overridable?: boolean }[])
      const fresh = await trainingV3.session(id)
      setDetail(fresh)
      if (list.length === 0) showToast('success', 'No conflicts', 'Session is clear.')
    } catch (err) {
      showToast('error', 'Conflict check failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const override = async () => {
    if (!detail || overrideReason.trim().length < 10) {
      showToast('error', 'Reason required', 'Override reason must be 10+ characters.')
      return
    }
    const keys = conflicts.map((c) => c.conflictKey).filter(Boolean) as string[]
    if (keys.length === 0) return
    try {
      await trainingV3.overrideConflicts(detail.id, keys, overrideReason.trim())
      showToast('success', 'Conflicts overridden', '')
      setOverrideReason('')
      checkConflicts(detail.id)
    } catch (err) {
      showToast('error', 'Override failed', backendErrorMessage(err))
    }
  }

  const transition = async () => {
    if (!transitionTarget) return
    try {
      const updated = await trainingV3.transitionSession(
        transitionTarget.id,
        transitionTarget.to,
        transitionReason.trim() || undefined,
      )
      setDetail(updated)
      showToast('success', `Session ${transitionTarget.to}`, '')
      setTransitionTarget(null)
      setTransitionReason('')
      load()
    } catch (err) {
      showToast('error', 'Transition failed', backendErrorMessage(err))
    }
  }

  const openAttendance = async () => {
    if (!detail) return
    // Enrolled students of assigned groups are the attendance roster.
    const rosters = await Promise.all(
      ((detail as unknown as { groupIds?: string[] }).groupIds ?? []).map((g) =>
        trainingV3.enrollments(g, { page: 1, pageSize: 200 }).catch(() => ({ items: [] })),
      ),
    )
    const seen = new Map<string, string>()
    for (const r of rosters) {
      for (const e of (r as { items: { studentId?: string; status?: string }[] }).items ?? []) {
        if (e.studentId && e.status === 'ACTIVE' && !seen.has(e.studentId)) seen.set(e.studentId, e.studentId)
      }
    }
    setAttendRows([...seen.keys()].map((studentId) => ({ studentId, status: 'PRESENT', note: '' })))
    setAttendOpen(true)
  }

  const saveAttendance = async () => {
    if (!detail || busy) return
    setBusy(true)
    try {
      await trainingV3.recordAttendance(
        detail.id,
        attendRows.map((r) => ({ studentId: r.studentId, status: r.status, ...(r.note ? { note: r.note } : {}) })),
      )
      showToast('success', 'Attendance recorded', `${attendRows.length} records.`)
      setAttendOpen(false)
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const statusOf = (s: TrainingSession) => (s as unknown as { status?: string }).status ?? ''

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }} className="h-9 px-3 border rounded-lg text-sm">
            <option value="">{t('ai.allStatuses')}</option>
            {['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED'].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {canManage ? (
            <Button size="sm" onClick={openCreate}>{t('training.sessions.new')}</Button>
          ) : (
            <span className="text-xs text-slate-400" title="Requires training.manage permission">New session (no permission)</span>
          )}
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} · {t('training.sessions.title')}</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('training.sessions.title')} /></div>}
        {state === 'success' && items.length > 0 && (
          <>
            <div className="divide-y divide-slate-50">
              {items.map((s) => {
                const r = s as unknown as { title?: string; startsAt?: string; endsAt?: string; status?: string; assignedStudentCount?: number; activeConflictOverrideCount?: number }
                return (
                  <div key={s.id} onClick={() => { setDetail(s); setConflicts([]) }} className="px-4 py-3 hover:bg-slate-50 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <p className="font-medium flex-1">{r.title}</p>
                      <Badge variant={badgeVariantFor(r.status ?? '')} />
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{r.startsAt} → {r.endsAt} · {r.assignedStudentCount ?? 0} students{(r.activeConflictOverrideCount ?? 0) > 0 ? ` · ${r.activeConflictOverrideCount} overrides` : ''}</p>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
              <p className="text-sm text-slate-400">Page {meta.page} of {meta.totalPages}</p>
              <div className="flex gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="h-8 px-2 border rounded-lg disabled:opacity-40">‹</button>
                <span className="text-sm px-2">{page} / {meta.totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages} className="h-8 px-2 border rounded-lg disabled:opacity-40">›</button>
              </div>
            </div>
          </>
        )}
      </div>

      {detail && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-semibold">{(detail as unknown as { title?: string }).title}</p>
              <p className="mt-1"><Badge variant={badgeVariantFor(statusOf(detail))} /></p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setDetail(null)}>Close</Button>
          </div>
          <div className="flex gap-2 flex-wrap mt-3">
            {canManage && <Button variant="secondary" size="sm" onClick={() => openEdit(detail)}>{t('action.edit')}</Button>}
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => checkConflicts(detail.id)}>{t('training.sessions.checkConflicts')}</Button>
            {canPublish && statusOf(detail) === 'DRAFT' && (
              <Button size="sm" onClick={() => { setTransitionTarget({ id: detail.id, to: 'PUBLISHED' }); setTransitionReason('') }}>{t('training.sessions.publish')}</Button>
            )}
            {canPublish && statusOf(detail) === 'PUBLISHED' && (
              <>
                <Button size="sm" onClick={() => { setTransitionTarget({ id: detail.id, to: 'COMPLETED' }); setTransitionReason('') }}>{t('training.sessions.complete')}</Button>
                <Button variant="secondary" size="sm" onClick={() => { setTransitionTarget({ id: detail.id, to: 'CANCELLED' }); setTransitionReason('') }}>{t('training.sessions.cancelSession')}</Button>
              </>
            )}
            {canAttend && <Button variant="secondary" size="sm" onClick={openAttendance}>{t('training.sessions.attendance')}</Button>}
          </div>
          {conflicts.length > 0 && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-800">{t('training.sessions.conflicts')} ({conflicts.length})</p>
              {conflicts.map((c, i) => (
                <p key={i} className="text-xs font-mono text-amber-700">{c.kind}: {c.message} (overridable: {String(c.overridable)})</p>
              ))}
              {canOverride && conflicts.every((c) => c.overridable) && (
                <div className="mt-2 flex gap-2">
                  <input value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)} placeholder={t('training.sessions.overrideReason')} className="flex-1 h-9 px-3 border rounded-lg text-sm" />
                  <Button size="sm" onClick={override}>{t('training.sessions.override')}</Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => !busy && setCreateOpen(false)} title={editing ? t('training.sessions.edit') : t('training.sessions.new')} size="lg"
        footer={<><Button variant="secondary" disabled={busy} onClick={() => setCreateOpen(false)}>{t('f.cancel')}</Button><Button disabled={busy} onClick={save}>{busy ? t('f.saving') : t('f.save')}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label={t('f.title')} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('f.course')} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
              options={[{ value: '', label: t('f.select') }, ...courses.map((c) => ({ value: c.id, label: locName((c as unknown as { name?: { en?: string; ar?: string } }).name, 'en') }))]} required />
            <Select label={t('f.bay')} value={form.bayId} onChange={(e) => setForm({ ...form, bayId: e.target.value })}
              options={[{ value: '', label: t('f.select') }, ...bays.map((b) => ({ value: b.id, label: b.name }))]} required />
            <Select label={t('f.mentor')} value={form.mentorId} onChange={(e) => setForm({ ...form, mentorId: e.target.value })}
              options={[{ value: '', label: t('f.select') }, ...mentors.map((m) => ({ value: m.id, label: m.displayName ?? m.id.slice(0, 8) }))]} required />
            <Input label={t('f.capacity')} type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
            <Input label={t('f.startsAt')} type="datetime-local" value={form.startsAt} onChange={(e) => setForm({ ...form, startsAt: e.target.value })} required />
            <Input label={t('f.endsAt')} type="datetime-local" value={form.endsAt} onChange={(e) => setForm({ ...form, endsAt: e.target.value })} required />
          </div>
          <div>
            <p className="text-sm font-medium mb-1">{t('f.groupIds')} *</p>
            {groups.length === 0 ? (
              <Input label={t('f.groupIds')} value="" onChange={() => {}} placeholder="No groups loaded — reload the page" />
            ) : (
              <div className="border border-slate-200 rounded-lg p-2 max-h-32 overflow-y-auto flex flex-col gap-1">
                {groups.map((g) => {
                  const name = (g as unknown as { name?: string }).name ?? g.id.slice(0, 8)
                  const checked = form.groupIds.includes(g.id)
                  return (
                    <label key={g.id} className="flex items-center gap-2 text-sm px-1 py-0.5 hover:bg-slate-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => setForm({
                          ...form,
                          groupIds: checked ? form.groupIds.filter((x) => x !== g.id) : [...form.groupIds, g.id],
                        })}
                      />
                      <span>{name}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>

      <Modal open={transitionTarget !== null} onClose={() => setTransitionTarget(null)} title={`Session → ${transitionTarget?.to}`} size="sm"
        footer={<><Button variant="secondary" onClick={() => setTransitionTarget(null)}>Cancel</Button><Button onClick={transition}>Confirm</Button></>}>
        <Textarea label={t('f.reasonOptional')} value={transitionReason} onChange={(e) => setTransitionReason(e.target.value)} rows={2} />
      </Modal>

      <Modal open={attendOpen} onClose={() => setAttendOpen(false)} title="Record attendance (mentor)" size="lg"
        footer={<><Button variant="secondary" onClick={() => setAttendOpen(false)}>Cancel</Button><Button disabled={busy} onClick={saveAttendance}>{busy ? 'Saving…' : 'Save attendance'}</Button></>}>
        {attendRows.length === 0 ? <p className="text-xs text-slate-400">No enrolled students in the assigned groups.</p> : (
          <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
            {attendRows.map((r, i) => (
              <div key={r.studentId} className="grid grid-cols-12 gap-2 items-center border border-slate-100 rounded-lg p-2">
                <span className="col-span-5 font-mono text-xs">{r.studentId.slice(0, 8)}…</span>
                <select value={r.status} onChange={(e) => setAttendRows((prev) => prev.map((x, j) => (j === i ? { ...x, status: e.target.value } : x)))} className="col-span-3 h-9 px-2 border rounded-lg text-sm">
                  {['PRESENT', 'ABSENT', 'LATE', 'EXCUSED'].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
                <input value={r.note} onChange={(e) => setAttendRows((prev) => prev.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)))} placeholder={t('f.note')} className="col-span-4 h-9 px-2 border rounded-lg text-sm" />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Courses ──────────────────────────────────────────────────────────────

function CoursesTab({ canManage }: { canManage: boolean }) {
  const { t, lang } = useLang()
  const { showToast } = useToast()
  const [items, setItems] = useState<Course[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Course | null>(null)
  const [terms, setTerms] = useState<{ id: string; name: string }[]>([])
  const [tasks, setTasks] = useState<{ id: string; title?: { en?: string } }[]>([])
  const [form, setForm] = useState({ code: '', nameEn: '', nameAr: '', termId: '', description: '', minAttendance: '', taskIds: '', status: 'DRAFT', orgScopeId: '' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.courses({ page, pageSize: PAGE_SIZE, q: debouncedQ || undefined })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    Promise.all([
      trainingV3.terms({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      trainingV3.tasks({ page: 1, pageSize: 200 }).catch(() => ({ items: [] })),
    ]).then(([t, k]) => {
      setTerms((((t as { items: never[] }).items ?? []) as unknown as { id: string; name: string }[]))
      setTasks((((k as { items: never[] }).items ?? []) as unknown as { id: string; title?: { en?: string } }[]))
    })
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ code: '', nameEn: '', nameAr: '', termId: '', description: '', minAttendance: '', taskIds: '', status: 'DRAFT', orgScopeId: '' })
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (c: Course) => {
    const r = c as unknown as { name?: { en?: string; ar?: string }; description?: string; minimumAttendancePercent?: number; status?: string; tasks?: { taskId?: string }[] }
    setEditing(c)
    setForm({
      code: '',
      nameEn: r.name?.en ?? '',
      nameAr: r.name?.ar ?? '',
      termId: '',
      description: r.description ?? '',
      minAttendance: String(r.minimumAttendancePercent ?? ''),
      taskIds: (r.tasks ?? []).map((t) => t.taskId).filter(Boolean).join(','),
      status: r.status ?? 'DRAFT',
      orgScopeId: '',
    })
    setSaveError(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      const taskIds = form.taskIds.split(',').map((s) => s.trim()).filter(Boolean)
      if (editing) {
        await trainingV3.updateCourse(editing.id, {
          name: { en: form.nameEn.trim(), ...(form.nameAr ? { ar: form.nameAr } : {}) },
          ...(form.description ? { description: form.description } : {}),
          tasks: taskIds.map((taskId) => ({ taskId, required: true })),
          ...(form.minAttendance ? { minimumAttendancePercent: Number(form.minAttendance) } : {}),
          status: form.status as 'DRAFT' | 'ACTIVE' | 'ARCHIVED',
        })
        showToast('success', 'Course updated', '')
      } else {
        if (!form.code.trim() || !form.nameEn.trim() || !form.termId || !form.minAttendance || !form.orgScopeId) {
          setSaveError(new ApiError({ message: 'Unit, code, English name, term and minimum attendance are required.', code: 'BAD_REQUEST', status: 400 }))
          setSaving(false)
          return
        }
        await trainingV3.createCourse({
          organizationScopeId: form.orgScopeId,
          code: form.code.trim(),
          name: { en: form.nameEn.trim(), ...(form.nameAr ? { ar: form.nameAr } : {}) },
          termId: form.termId,
          ...(form.description ? { description: form.description } : {}),
          tasks: taskIds.map((taskId) => ({ taskId, required: true })),
          minimumAttendancePercent: Number(form.minAttendance),
        } as never)
        showToast('success', 'Course created', form.code.trim())
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setSaveError(err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="flex-1 min-w-[200px]"><SearchBar value={q} onChange={setQ} placeholder={t('f.search')} /></div>
        {canManage && <Button size="sm" onClick={openCreate}>{t('training.courses.new')}</Button>}
        <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} · {t('training.courses.title')}</span>
      </div>
      {state === 'loading' && <div className="p-4"><LoadingState /></div>}
      {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('training.courses.title')} /></div>}
      {state === 'success' && items.length > 0 && (
        <div className="divide-y divide-slate-50">
          {items.map((c) => {
            const r = c as unknown as { name?: { en?: string; ar?: string }; status?: string; minimumAttendancePercent?: number; tasks?: unknown[] }
            return (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium">{locName(r.name, lang)}</p>
                  <p className="text-xs text-slate-400">min attendance {r.minimumAttendancePercent}% · {(r.tasks ?? []).length} tasks</p>
                </div>
                <Badge variant={badgeVariantFor(r.status ?? '')} />
                {canManage && <Button variant="secondary" size="sm" onClick={() => openEdit(c)}>Edit</Button>}
              </div>
            )
          })}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? t('training.courses.edit') : t('training.courses.new')} size="lg"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>{t('f.cancel')}</Button><Button disabled={saving} onClick={save}>{saving ? t('f.saving') : t('f.save')}</Button></>}>
        <CourseForm
          form={form}
          setForm={setForm}
          terms={terms}
          tasks={tasks}
          editing={!!editing}
          saveError={saveError}
          orgScopePicker={<OrgScopePicker onPick={(id) => setForm((f) => ({ ...f, orgScopeId: id }))} />}
        />
      </Modal>
    </div>
  )
}

function OrgScopePicker({ onPick }: { onPick: (id: string) => void }) {
  const { t } = useLang()
  const { organizationScopeIds } = useAuth()
  const [scopes, setScopes] = useState<{ id: string; name?: string }[]>([])
  const [value, setValue] = useState('')
  useEffect(() => {
    usersV3
      .scopes({ page: 1, pageSize: 100 })
      .then((res) => {
        const list = (res.items ?? []).map((s) => ({
          id: s.id,
          name: (s as unknown as { name?: string }).name,
        }))
        setScopes(list)
        if (list.length === 1) {
          setValue(list[0].id)
          onPick(list[0].id)
        }
      })
      .catch(() => {
        // Training Supervisor has training.manage but not scopes.manage/
        // users.read, so this list is a 403 for them — fall back to their
        // own unit(s) from /auth/me instead of making them hand-type a UUID.
        if (organizationScopeIds.length > 0) {
          setScopes(organizationScopeIds.map((id) => ({ id })))
          if (organizationScopeIds.length === 1) {
            setValue(organizationScopeIds[0])
            onPick(organizationScopeIds[0])
          }
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationScopeIds])
  if (scopes.length === 0) {
    return <Input label={t('training.terms.orgScope')} value={value} onChange={(e) => { setValue(e.target.value); onPick(e.target.value) }} required placeholder={t('training.terms.orgScopePlaceholder')} />
  }
  return (
    <Select label={t('training.terms.orgScope')} value={value} onChange={(e) => { setValue(e.target.value); onPick(e.target.value) }}
      options={[{ value: '', label: 'Select' }, ...scopes.map((s) => ({ value: s.id, label: s.name ?? s.id }))]} required />
  )
}

interface CourseFormState {
  code: string
  nameEn: string
  nameAr: string
  termId: string
  description: string
  minAttendance: string
  taskIds: string
  status: string
  orgScopeId: string
}

function CourseForm({ form, setForm, terms, tasks, editing, saveError, orgScopePicker }: {
  form: CourseFormState
  setForm: React.Dispatch<React.SetStateAction<CourseFormState>>
  terms: { id: string; name: string }[]
  tasks: { id: string; title?: { en?: string } }[]
  editing: boolean
  saveError: unknown
  orgScopePicker: React.ReactNode
}) {
  const { t } = useLang()
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }))
  return (
    <div className="flex flex-col gap-3">
      {!editing && (
        <>
          {orgScopePicker}
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('f.code')} value={form.code} onChange={(e) => set('code', e.target.value)} required />
            <Select label={t('training.terms.term')} value={form.termId} onChange={(e) => set('termId', e.target.value)}
              options={[{ value: '', label: 'Select' }, ...terms.map((t) => ({ value: t.id, label: t.name }))]} required />
          </div>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Name (en)" value={form.nameEn} onChange={(e) => set('nameEn', e.target.value)} required />
        <Input label="Name (ar)" value={form.nameAr} onChange={(e) => set('nameAr', e.target.value)} />
      </div>
      <Textarea label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} rows={2} />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Minimum attendance %" type="number" value={form.minAttendance} onChange={(e) => set('minAttendance', e.target.value)} required={!editing} />
        {editing && (
          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}
            options={['DRAFT', 'ACTIVE', 'ARCHIVED'].map((s) => ({ value: s, label: s }))} />
        )}
      </div>
      <div>
        <p className="text-sm font-medium mb-1">Practical tasks ({tasks.length} available)</p>
        <Input label="Task IDs (comma-separated UUIDs, all required)" value={form.taskIds} onChange={(e) => set('taskIds', e.target.value)} />
        <p className="text-xs text-slate-400 mt-1">Manage the catalog under Competencies.</p>
      </div>
      {saveError ? <FieldErrors error={saveError} /> : null}
    </div>
  )
}

// ── Groups ───────────────────────────────────────────────────────────────

function GroupsTab({ canManage }: { canManage: boolean }) {
  const { t } = useLang()
  const { showToast } = useToast()
  const [items, setItems] = useState<TrainingGroup[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<TrainingGroup | null>(null)
  const [enrollments, setEnrollments] = useState<never[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ name: '', courseId: '' })
  const [enrollStudentId, setEnrollStudentId] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.groups({ page, pageSize: PAGE_SIZE })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    Promise.all([
      trainingV3.courses({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      trainingV3.students({ page: 1, pageSize: 200 }).catch(() => ({ items: [] })),
    ]).then(([c, s]) => {
      setCourses((c as { items: Course[] }).items ?? [])
      setStudents((s as { items: Student[] }).items ?? [])
    })
  }, [])

  const openGroup = async (g: TrainingGroup) => {
    setSelected(g)
    try {
      const res = await trainingV3.enrollments(g.id, { page: 1, pageSize: 200 })
      setEnrollments(res.items as never[])
    } catch {
      setEnrollments([])
    }
  }

  const create = async () => {
    if (!form.name.trim() || !form.courseId || busy) return
    setBusy(true)
    try {
      await trainingV3.createGroup({ name: form.name.trim(), courseId: form.courseId })
      showToast('success', 'Group created', '')
      setCreateOpen(false)
      setForm({ name: '', courseId: '' })
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const enroll = async () => {
    if (!selected || !enrollStudentId) return
    try {
      await trainingV3.enroll(selected.id, enrollStudentId)
      showToast('success', 'Student enrolled', '')
      setEnrollStudentId('')
      openGroup(selected)
    } catch (err) {
      showToast('error', 'Enroll failed', backendErrorMessage(err))
    }
  }

  const withdraw = async (enrollmentId: string, reason: string) => {
    if (!selected || reason.trim().length < 3) {
      showToast('error', 'Reason required', 'Withdrawal needs a reason (3+ characters).')
      return
    }
    try {
      await trainingV3.withdrawEnrollment(enrollmentId, reason.trim())
      showToast('success', 'Withdrawn', '')
      openGroup(selected)
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const [withdrawId, setWithdrawId] = useState<string | null>(null)
  const [withdrawReason, setWithdrawReason] = useState('')

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold">Training groups</p>
          {canManage && <Button size="sm" onClick={() => setCreateOpen(true)}>{t('training.groups.newGroup')}</Button>}
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} groups</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('training.groups.title')} /></div>}
        {state === 'success' && items.length > 0 && (
          <div className="divide-y divide-slate-50">
            {items.map((g) => {
              const r = g as unknown as { name?: string; status?: string }
              return (
                <div key={g.id} onClick={() => openGroup(g)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                  <p className="font-medium flex-1">{r.name}</p>
                  <Badge variant={badgeVariantFor(r.status ?? '')} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <p className="font-semibold">{t('training.groups.enrollments')} ({enrollments.length})</p>
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </div>
          {canManage && (
            <div className="flex gap-2 mt-3">
              <select value={enrollStudentId} onChange={(e) => setEnrollStudentId(e.target.value)} className="flex-1 h-9 px-3 border rounded-lg text-sm">
                <option value="">Select student</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{(s as unknown as { displayName?: string; studentNumber?: string }).displayName} ({(s as unknown as { studentNumber?: string }).studentNumber})</option>
                ))}
              </select>
              <Button size="sm" onClick={enroll}>{t('training.groups.enroll')}</Button>
            </div>
          )}
          <div className="mt-3 flex flex-col gap-2">
            {(enrollments as unknown as { id: string; studentId?: string; status?: string }[]).map((e) => (
              <div key={e.id} className="border border-slate-100 rounded-lg p-2 text-sm flex items-center gap-2">
                <span className="font-mono text-xs flex-1">{e.studentId?.slice(0, 8)}… · {e.status}</span>
                {canManage && e.status === 'ACTIVE' && (
                  <Button variant="secondary" size="sm" onClick={() => { setWithdrawId(e.id); setWithdrawReason('') }}>{t('training.groups.withdraw')}</Button>
                )}
              </div>
            ))}
            {enrollments.length === 0 && <p className="text-xs text-slate-400">{t('training.groups.noStudents')}</p>}
          </div>
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('training.groups.newGroup')} size="md"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label={t('training.terms.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Select label={t('f.course')} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}
            options={[{ value: '', label: 'Select' }, ...courses.map((c) => ({ value: c.id, label: (c as unknown as { code?: string }).code ?? c.id }))]} required />
        </div>
      </Modal>

      <Modal open={withdrawId !== null} onClose={() => setWithdrawId(null)} title={t('training.groups.withdrawTitle')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setWithdrawId(null)}>Cancel</Button><Button onClick={() => withdrawId && withdraw(withdrawId, withdrawReason)}>{t('training.groups.withdraw')}</Button></>}>
        <Textarea label={t('f.reasonRequired')} value={withdrawReason} onChange={(e) => setWithdrawReason(e.target.value)} rows={3} required />
      </Modal>
    </div>
  )
}

// ── Students ─────────────────────────────────────────────────────────────

function StudentsTab({ canManage }: { canManage: boolean }) {
  const { t, lang } = useLang()
  const { showToast } = useToast()
  const [items, setItems] = useState<Student[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [selected, setSelected] = useState<Student | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [courseId, setCourseId] = useState('')
  const [coverage, setCoverage] = useState<unknown>(null)
  const [eligibility, setEligibility] = useState<unknown>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState({ userId: '', studentNumber: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQ(q.trim())
      setPage(1)
    }, 400)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.students({ page, pageSize: PAGE_SIZE, q: debouncedQ || undefined })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page, debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    trainingV3.courses({ page: 1, pageSize: 100 }).then(
      (r) => setCourses(r.items ?? []),
      () => {},
    )
  }, [])

  const openStudent = async (s: Student) => {
    setSelected(s)
    setCoverage(null)
    setEligibility(null)
  }

  const loadProgress = async () => {
    if (!selected || !courseId) return
    try {
      const [c, e] = await Promise.all([
        trainingV3.coverage(selected.id, courseId),
        trainingV3.eligibility(selected.id, courseId),
      ])
      setCoverage(c)
      setEligibility(e)
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  const create = async () => {
    if (!form.userId.trim() || !form.studentNumber.trim() || busy) return
    setBusy(true)
    try {
      await trainingV3.createStudent({ userId: form.userId.trim(), studentNumber: form.studentNumber.trim() })
      showToast('success', 'Student created', '')
      setCreateOpen(false)
      setForm({ userId: '', studentNumber: '' })
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <div className="flex-1 min-w-[200px]"><SearchBar value={q} onChange={setQ} placeholder={t('f.search')} /></div>
          {canManage && <Button size="sm" onClick={() => setCreateOpen(true)}>{t('training.students.newStudent')}</Button>}
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} students</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('training.students.noStudents')} /></div>}
        {state === 'success' && items.length > 0 && (
          <div className="divide-y divide-slate-50">
            {items.map((s) => {
              const r = s as unknown as { displayName?: string; studentNumber?: string; status?: string }
              return (
                <div key={s.id} onClick={() => openStudent(s)} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{r.displayName ?? r.studentNumber}</p>
                    <p className="text-xs text-slate-400 font-mono">{r.studentNumber}</p>
                  </div>
                  <Badge variant={badgeVariantFor(r.status ?? '')} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {selected && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between">
            <p className="font-semibold">Progress — {(selected as unknown as { displayName?: string }).displayName}</p>
            <Button variant="secondary" size="sm" onClick={() => setSelected(null)}>Close</Button>
          </div>
          <div className="flex gap-2 mt-3">
            <select value={courseId} onChange={(e) => setCourseId(e.target.value)} className="flex-1 h-9 px-3 border rounded-lg text-sm">
              <option value="">{t('training.students.selectCourse')}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{locName((c as unknown as { name?: { en?: string; ar?: string } }).name, lang)}</option>
              ))}
            </select>
            <Button size="sm" onClick={loadProgress}>{t('training.students.checkEligibility')}</Button>
          </div>
          {eligibility !== null && (
            <div className="mt-3 bg-slate-50 rounded-lg p-3 text-sm">
              {Object.entries(eligibility as Record<string, unknown>).map(([k, v]) => (
                <p key={k} className="text-xs font-mono break-all">{k}: {typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>
              ))}
            </div>
          )}
          {coverage !== null && (
            <div className="mt-3">
              <p className="text-sm font-semibold">{t('training.students.coverage')}: {(coverage as { overallPercent?: string }).overallPercent}%</p>
              {((coverage as { competencies?: { competencyId?: string; percent?: string }[] }).competencies ?? []).map((c, i) => (
                <p key={i} className="text-xs font-mono">{c.competencyId?.slice(0, 8)}… — {c.percent}%</p>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title={t('training.students.newStudent')} size="md"
        footer={<><Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button><Button disabled={busy} onClick={create}>{busy ? 'Creating…' : 'Create'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label={t('training.students.userId')} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required />
          <Input label={t('training.students.studentNumber')} value={form.studentNumber} onChange={(e) => setForm({ ...form, studentNumber: e.target.value })} required />
        </div>
      </Modal>
    </div>
  )
}

// ── Mentors ──────────────────────────────────────────────────────────────

function MentorsTab({ canManage }: { canManage: boolean }) {
  const { t } = useLang()
  const { showToast } = useToast()
  const [mentors, setMentors] = useState<never[]>([])
  const [profiles, setProfiles] = useState<never[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string; version?: number } | null>(null)
  const [form, setForm] = useState({ displayName: '', userId: '', unlink: false })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const [m, p] = await Promise.all([
        trainingV3.mentors({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
        canManage ? trainingV3.mentorProfiles({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })) : Promise.resolve({ items: [] }),
      ])
      setMentors(((m as { items: never[] }).items ?? []) as never[])
      setProfiles(((p as { items: never[] }).items ?? []) as never[])
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [canManage])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (saving || !form.displayName.trim()) return
    setSaving(true)
    try {
      if (editing) {
        await trainingV3.updateMentorProfile(editing.id, {
          version: editing.version,
          displayName: form.displayName.trim(),
          ...(form.unlink ? { userId: null } : form.userId ? { userId: form.userId } : {}),
        } as never)
        showToast('success', 'Profile updated', '')
      } else {
        await trainingV3.createMentorProfile({
          displayName: form.displayName.trim(),
          ...(form.userId ? { userId: form.userId } : {}),
        })
        showToast('success', 'Profile created', '')
      }
      setModalOpen(false)
      setEditing(null)
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold">Mentors ({mentors.length})</p>
          {canManage && <Button size="sm" onClick={() => { setEditing(null); setForm({ displayName: '', userId: '', unlink: false }); setModalOpen(true) }}>{t('training.mentors.newProfile')}</Button>}
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && (
          <div className="divide-y divide-slate-50">
            {(mentors as unknown as { id: string; displayName?: string }[]).map((m) => (
              <p key={m.id} className="px-4 py-3 text-sm">{m.displayName ?? m.id}</p>
            ))}
            {mentors.length === 0 && <p className="px-4 py-3 text-xs text-slate-400">{t('training.mentors.noMentors')}</p>}
          </div>
        )}
      </div>
      {canManage && (
        <div className="bg-white border border-slate-200 rounded-xl">
          <p className="text-sm font-semibold px-4 py-3 border-b border-slate-100">Mentor profiles ({profiles.length})</p>
          <div className="divide-y divide-slate-50">
            {(profiles as unknown as { id: string; displayName?: string; status?: string; version?: number }[]).map((p) => (
              <div key={p.id} className="px-4 py-3 flex items-center gap-3">
                <p className="text-sm flex-1">{p.displayName}</p>
                <Badge variant={badgeVariantFor(p.status ?? '')} />
                <Button variant="secondary" size="sm" onClick={() => {
                  setEditing({ id: p.id, version: p.version })
                  setForm({ displayName: p.displayName ?? '', userId: '', unlink: false })
                  setModalOpen(true)
                }}>Edit</Button>
              </div>
            ))}
          </div>
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit mentor profile' : 'New mentor profile'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          <Input label={t('f.name')} value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} required />
          {editing ? (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.unlink} onChange={(e) => setForm({ ...form, unlink: e.target.checked })} />
              {t('training.mentors.unlink')}
            </label>
          ) : (
            <Input label={t('training.mentors.userId')} value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} />
          )}
        </div>
      </Modal>
    </div>
  )
}

// ── Terms ────────────────────────────────────────────────────────────────

function TermsTab({ canManage }: { canManage: boolean }) {
  const { t } = useLang()
  const { showToast } = useToast()
  const [items, setItems] = useState<never[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string } | null>(null)
  const [form, setForm] = useState({ name: '', startDate: '', endDate: '', status: 'PLANNED' })
  const [saving, setSaving] = useState(false)
  const [orgScopeId, setOrgScopeId] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.terms({ page, pageSize: PAGE_SIZE })
      setItems(res.items as never[])
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    if (saving) return
    setSaving(true)
    try {
      if (editing) {
        await trainingV3.updateTerm(editing.id, {
          ...(form.name ? { name: form.name } : {}),
          ...(form.startDate ? { startDate: form.startDate } : {}),
          ...(form.endDate ? { endDate: form.endDate } : {}),
          status: form.status as 'PLANNED' | 'ACTIVE' | 'CLOSED',
        })
        showToast('success', 'Term updated', '')
      } else {
        if (!orgScopeId || !form.name.trim() || !form.startDate || !form.endDate) {
          showToast('error', 'Missing fields', 'Unit, name, start and end dates are required.')
          setSaving(false)
          return
        }
        await trainingV3.createTerm({ organizationScopeId: orgScopeId, name: form.name.trim(), startDate: form.startDate, endDate: form.endDate })
        showToast('success', 'Term created', '')
      }
      setModalOpen(false)
      setEditing(null)
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <p className="text-sm font-semibold">Training terms</p>
        {canManage && <Button size="sm" onClick={() => { setEditing(null); setForm({ name: '', startDate: '', endDate: '', status: 'PLANNED' }); setModalOpen(true) }}>{t('training.terms.newTerm')}</Button>}
        <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} terms</span>
      </div>
      {state === 'loading' && <div className="p-4"><LoadingState /></div>}
      {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('training.terms.noTerms')} /></div>}
      {state === 'success' && items.length > 0 && (
        <div className="divide-y divide-slate-50">
          {(items as unknown as { id: string; name?: string; startDate?: string; endDate?: string; status?: string }[]).map((t) => (
            <div key={t.id} className="px-4 py-3 flex items-center gap-3">
              <div className="flex-1">
                <p className="font-medium text-sm">{t.name}</p>
                <p className="text-xs text-slate-400">{t.startDate} → {t.endDate}</p>
              </div>
              <Badge variant={badgeVariantFor(t.status ?? '')} />
              {canManage && (
                <Button variant="secondary" size="sm" onClick={() => {
                  setEditing({ id: t.id })
                  setForm({ name: t.name ?? '', startDate: t.startDate ?? '', endDate: t.endDate ?? '', status: t.status ?? 'PLANNED' })
                  setModalOpen(true)
                }}>Edit</Button>
              )}
            </div>
          ))}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit term' : 'New term'} size="md"
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          {!editing && <OrgScopeIdInput value={orgScopeId} onChange={setOrgScopeId} />}
          <Input label={t('training.terms.name')} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required={!editing} />
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('training.terms.startDate')} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} placeholder="2026-01-01" required={!editing} />
            <Input label={t('training.terms.endDate')} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} placeholder="2026-06-30" required={!editing} />
          </div>
          {editing && (
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={['PLANNED', 'ACTIVE', 'CLOSED'].map((s) => ({ value: s, label: s }))} />
          )}
        </div>
      </Modal>
    </div>
  )
}

function OrgScopeIdInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useLang()
  return <Input label={t('training.terms.orgScope')} value={value} onChange={(e) => onChange(e.target.value)} required placeholder={t('training.terms.orgScopePlaceholder')} />
}

// ── Certificates ─────────────────────────────────────────────────────────

function CertificatesTab() {
  const { t } = useLang()
  const { showToast } = useToast()
  const { hasPermission } = useAuth()
  const canIssue = hasPermission(PERMS.certificatesIssue)
  const canRevoke = hasPermission(PERMS.certificatesRevoke)
  const [items, setItems] = useState<Certificate[]>([])
  const [meta, setMeta] = useState({ page: 1, pageSize: PAGE_SIZE, totalItems: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [issueOpen, setIssueOpen] = useState(false)
  const [issueForm, setIssueForm] = useState({ studentId: '', courseId: '' })
  const [issuedToken, setIssuedToken] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [revokeId, setRevokeId] = useState<string | null>(null)
  const [revokeReason, setRevokeReason] = useState('')

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.certificates({ page, pageSize: PAGE_SIZE })
      setItems(res.items)
      setMeta(res.page)
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const issue = async () => {
    if (!issueForm.studentId.trim() || !issueForm.courseId.trim() || busy) return
    setBusy(true)
    try {
      // CERTIFICATE_NOT_ELIGIBLE when requirements are unmet — surfaced below.
      const cert = await trainingV3.issueCertificate(issueForm.studentId.trim(), issueForm.courseId.trim(), newIdempotencyKey())
      setIssuedToken((cert as unknown as { verificationToken?: string }).verificationToken ?? null)
      showToast('success', 'Certificate issued', (cert as unknown as { certificateNumber?: string }).certificateNumber ?? '')
      load()
    } catch (err) {
      const msg = backendErrorMessage(err)
      showToast('error', 'Issue failed', err instanceof ApiError && err.requestId ? `${msg} (requestId ${err.requestId})` : msg)
    } finally {
      setBusy(false)
    }
  }

  const revoke = async () => {
    if (!revokeId || revokeReason.trim().length < 3) {
      showToast('error', 'Reason required', 'Revocation needs a reason (3+ characters).')
      return
    }
    try {
      await trainingV3.revokeCertificate(revokeId, revokeReason.trim())
      showToast('success', 'Certificate revoked', '')
      setRevokeId(null)
      setRevokeReason('')
      load()
    } catch (err) {
      showToast('error', 'Failed', backendErrorMessage(err))
    }
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
          <p className="text-sm font-semibold">Certificates</p>
          {canIssue && <Button size="sm" onClick={() => { setIssueForm({ studentId: '', courseId: '' }); setIssuedToken(null); setIssueOpen(true) }}>{t('training.certs.issue')}</Button>}
          <span className="text-xs text-slate-400 ms-auto">{meta.totalItems} certificates</span>
        </div>
        {state === 'loading' && <div className="p-4"><LoadingState /></div>}
        {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
        {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('training.certs.noCertificates')} /></div>}
        {state === 'success' && items.length > 0 && (
          <div className="divide-y divide-slate-50">
            {items.map((c) => {
              const r = c as unknown as { certificateNumber?: string; status?: string; issuedAt?: string }
              return (
                <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-mono text-sm" dir="ltr">{r.certificateNumber}</p>
                    <p className="text-xs text-slate-400">{r.issuedAt}</p>
                  </div>
                  <Badge variant={badgeVariantFor(r.status ?? '')} />
                  {canRevoke && r.status === 'ISSUED' && (
                    <Button variant="secondary" size="sm" onClick={() => { setRevokeId(c.id); setRevokeReason('') }}>{t('training.certs.revoke')}</Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal open={issueOpen} onClose={() => setIssueOpen(false)} title={t('training.certs.issue')} size="md"
        footer={issuedToken ? <Button onClick={() => setIssueOpen(false)}>Done</Button> : <><Button variant="secondary" onClick={() => setIssueOpen(false)}>Cancel</Button><Button disabled={busy} onClick={issue}>{busy ? 'Issuing…' : 'Issue'}</Button></>}>
        {issuedToken ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800">Verification token (shown once)</p>
            <p className="font-mono font-bold mt-2 select-all break-all" dir="ltr">{issuedToken}</p>
            <p className="text-xs text-green-700 mt-1">Public verification: /verify/{issuedToken}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <Input label={t('training.certs.studentId')} value={issueForm.studentId} onChange={(e) => setIssueForm({ ...issueForm, studentId: e.target.value })} required />
            <Input label={t('training.certs.courseId')} value={issueForm.courseId} onChange={(e) => setIssueForm({ ...issueForm, courseId: e.target.value })} required />
            <p className="text-xs text-slate-400">The student must meet completion eligibility, else CERTIFICATE_NOT_ELIGIBLE.</p>
          </div>
        )}
      </Modal>

      <Modal open={revokeId !== null} onClose={() => setRevokeId(null)} title={t('training.certs.revokeTitle')} size="sm"
        footer={<><Button variant="secondary" onClick={() => setRevokeId(null)}>Cancel</Button><Button onClick={revoke}>{t('training.certs.revoke')}</Button></>}>
        <Textarea label={t('f.reasonRequired')} value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} rows={3} required />
      </Modal>
    </div>
  )
}
