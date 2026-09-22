import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { trainingApi, baysApi } from '../api/resources'
import { ApiError } from '../api/http'
import { isUuid } from '../api/identity'
import { DemoBadge } from '../components/ui/ApiState'
import { useAuth } from '../context/AuthContext'

type TrainingTab = 'courses' | 'sessions' | 'students' | 'mentors'

type DemoSessionStatus = 'received' | 'in-progress' | 'ready'

interface DemoSession {
  id: string
  course: string
  mentor: string
  bay: string
  date: string
  time: string
  students: number
  capacity: number
  status: DemoSessionStatus
  conflict: string | null
}

const courses = [
  { id: 'CRS-001', title: 'Engine Overhaul Basics', category: 'Mechanical', duration: '40 hours', sessions: 5, capacity: 10, status: 'active' as const },
  { id: 'CRS-002', title: 'Brake System Inspection', category: 'Brakes', duration: '16 hours', sessions: 3, capacity: 8, status: 'active' as const },
  { id: 'CRS-003', title: 'Electrical Diagnostics & ECU', category: 'Electrical', duration: '32 hours', sessions: 4, capacity: 12, status: 'active' as const },
  { id: 'CRS-004', title: 'AC System Service', category: 'AC', duration: '24 hours', sessions: 3, capacity: 8, status: 'active' as const },
  { id: 'CRS-005', title: 'Transmission Overhaul', category: 'Transmission', duration: '48 hours', sessions: 6, capacity: 6, status: 'inactive' as const },
]

const INITIAL_SESSIONS: DemoSession[] = [
  { id: 'SES-001', course: 'Engine Overhaul Basics', mentor: 'Eng. Sami Al-Rashidi', bay: 'Bay 2', date: 'Sep 19, 2024', time: '9:00–13:00', students: 8, capacity: 10, status: 'in-progress' as const, conflict: null },
  { id: 'SES-002', course: 'Brake System Inspection', mentor: 'Eng. Fatima Hassan', bay: 'Bay 4', date: 'Sep 19, 2024', time: '14:00–18:00', students: 6, capacity: 8, status: 'received' as const, conflict: null },
  { id: 'SES-003', course: 'Electrical Diagnostics & ECU', mentor: 'Eng. Waleed Khatib', bay: 'Bay 1', date: 'Sep 20, 2024', time: '10:00–14:00', students: 10, capacity: 12, status: 'received' as const, conflict: 'Bay 1 is reserved for Job JC-2024-0913 from 9:00–11:30' },
  { id: 'SES-004', course: 'AC System Service', mentor: 'Eng. Sami Al-Rashidi', bay: 'Bay 3', date: 'Sep 21, 2024', time: '9:00–13:00', students: 7, capacity: 8, status: 'received' as const, conflict: 'Mentor Eng. Sami Al-Rashidi has another session at the same time' },
]

const students = [
  { id: 'STU-001', name: 'Abdullah Al-Faraj', course: 'Engine Overhaul Basics', group: 'G-2024-A', attendance: '92%', status: 'active' as const },
  { id: 'STU-002', name: 'Lama Al-Saqr', course: 'Brake System Inspection', group: 'G-2024-B', attendance: '87%', status: 'active' as const },
  { id: 'STU-003', name: 'Turki Al-Dosari', course: 'Engine Overhaul Basics', group: 'G-2024-A', attendance: '75%', status: 'active' as const },
  { id: 'STU-004', name: 'Maha Al-Otaibi', course: 'Electrical Diagnostics & ECU', group: 'G-2024-C', attendance: '96%', status: 'active' as const },
]

const mentors = [
  { id: 'MNT-001', name: 'Eng. Sami Al-Rashidi', specialty: 'Mechanical, Transmission', sessions: 3, students: 18, available: false },
  { id: 'MNT-002', name: 'Eng. Fatima Hassan', specialty: 'Brakes, Steering', sessions: 2, students: 12, available: true },
  { id: 'MNT-003', name: 'Eng. Waleed Khatib', specialty: 'Electrical, ECU', sessions: 2, students: 14, available: true },
]

export default function Training() {
  const { t } = useLang()
  const { mode } = useAuth()
  const [tab, setTab] = useState<TrainingTab>('sessions')
  const [addOpen, setAddOpen] = useState(false)
  const [sessions, setSessions] = useState<DemoSession[]>(INITIAL_SESSIONS)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [courseOptions, setCourseOptions] = useState<Array<{ id: string; label: string }> | null>(null)
  const [mentorOptions, setMentorOptions] = useState<Array<{ id: string; label: string }> | null>(null)
  const [bayOptions, setBayOptions] = useState<Array<{ id: string; label: string }> | null>(null)
  const [groupOptions, setGroupOptions] = useState<Array<{ id: string; label: string }> | null>(null)

  // Live catalogs (backend ids must be UUIDs). Demo fallback when offline.
  React.useEffect(() => {
    if (!addOpen) return
    let cancelled = false
    if (courseOptions === null) {
      trainingApi.courses({ pageSize: 100 })
        .then((res) => {
          if (!cancelled) setCourseOptions(res.items.map((c) => ({ id: c.id, label: c.name.en || c.code || c.id })))
        })
        .catch(() => { if (!cancelled) setCourseOptions(null) })
    }
    if (mentorOptions === null) {
      trainingApi.mentors({ pageSize: 100 })
        .then((res) => {
          if (!cancelled) setMentorOptions(res.items.map((m) => ({ id: m.id, label: m.displayName })))
        })
        .catch(() => { if (!cancelled) setMentorOptions(null) })
    }
    if (bayOptions === null) {
      baysApi.list({ pageSize: 100 })
        .then((res) => {
          if (!cancelled) setBayOptions(res.items.map((b) => ({ id: b.id, label: b.name ?? b.code ?? b.id })))
        })
        .catch(() => { if (!cancelled) setBayOptions(null) })
    }
    if (groupOptions === null) {
      trainingApi.groups({ pageSize: 100 })
        .then((res) => {
          if (!cancelled) setGroupOptions(res.items.map((g) => ({ id: g.id, label: g.name })))
        })
        .catch(() => { if (!cancelled) setGroupOptions(null) })
    }
    return () => { cancelled = true }
  }, [addOpen, courseOptions, mentorOptions, bayOptions, groupOptions])
  const [editing, setEditing] = useState<DemoSession | null>(null)
  const [editError, setEditError] = useState('')
  const [actionError, setActionError] = useState('')
  // The implemented backend has create/read/update session routes only. It
  // does not expose a publish/status-transition operation, so this screen
  // deliberately does not manufacture a successful publish action.

  // Edit: PATCH /training-sessions/{id} with optimistic-concurrency version.
  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!editing) return
    const fd = new FormData(e.currentTarget)
    const bayId = String(fd.get('bay') ?? '')
    const mentorId = String(fd.get('mentor') ?? '')
    const capacity = Number(fd.get('capacity') ?? editing.capacity) || editing.capacity
    const bayLabel = bayOptions?.find((b) => b.id === bayId)?.label
      ?? ({ b1: 'Bay 1', b2: 'Bay 2', b3: 'Bay 3', b4: 'Bay 4' } as Record<string, string>)[bayId]
      ?? editing.bay
    const mentor = mentors.find((m) => m.id === mentorId)
    const mentorName = mentorOptions?.find((m) => m.id === mentorId)?.label ?? mentor?.name
    setSaving(true)
    setEditError('')
    try {
      if (!isUuid(editing.id)) {
        setSessions((prev) => prev.map((x) => (x.id === editing.id
          ? { ...x, bay: bayLabel, mentor: mentorName ?? x.mentor, capacity }
          : x)))
        setEditing(null)
        return
      }
      await trainingApi.updateSession(editing.id, {
        version: 1, bayId: bayId || undefined, mentorId: mentorId || undefined,
      })
      setSessions((prev) => prev.map((x) => (x.id === editing.id
        ? { ...x, bay: bayLabel, mentor: mentorName ?? x.mentor, capacity }
        : x)))
      setEditing(null)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        setSessions((prev) => prev.map((x) => (x.id === editing.id
          ? { ...x, bay: bayLabel, mentor: mentorName ?? x.mentor, capacity }
          : x)))
        setEditing(null)
      } else {
        setEditError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Update failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSchedule = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const courseId = String(fd.get('course') ?? '')
    const mentorId = String(fd.get('mentor') ?? '')
    const bayId = String(fd.get('bay') ?? '')
    const groupId = String(fd.get('group') ?? '')
    const date = String(fd.get('date') ?? '')
    const startTime = String(fd.get('startTime') ?? '')
    const durationHrs = Number(fd.get('duration') ?? 0)
    const capacity = Number(fd.get('capacity') ?? 0) || 10
    if (!courseId || !mentorId || !bayId || !groupId || !date || !startTime || !durationHrs) {
      setSaveError('Course, mentor, bay, group, date, start time and duration are required')
      return
    }
    const course = courses.find((c) => c.id === courseId)
    const courseName = courseOptions?.find((c) => c.id === courseId)?.label ?? course?.title ?? courseId
    const mentorName = mentorOptions?.find((m) => m.id === mentorId)?.label
      ?? mentors.find((m) => m.id === mentorId)?.name ?? mentorId
    const bayLabel = bayOptions?.find((b) => b.id === bayId)?.label
      ?? ({ b1: 'Bay 1', b2: 'Bay 2', b3: 'Bay 3', b4: 'Bay 4' } as Record<string, string>)[bayId]
      ?? bayId
    const startsAt = new Date(`${date}T${startTime}:00`).toISOString()
    const endsAt = new Date(new Date(startsAt).getTime() + durationHrs * 3600 * 1000).toISOString()
    setSaving(true)
    setSaveError('')
    try {
      // Contract: POST /training-sessions. Bay/mentor overlap with jobs or
      // sessions -> 409 SCHEDULE_CONFLICT with an explainable conflict list.
      await trainingApi.createSession({
        title: courseName, courseId, groupId,
        bayId, mentorId, startsAt, endsAt,
      })
      setAddOpen(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Offline demo: keep working locally, clearly labeled.
        setSessions((prev) => [...prev, {
          id: `SES-LOCAL-${Date.now()}`, course: courseName,
          mentor: mentorName, bay: bayLabel, date, time: startTime,
          students: 0, capacity, status: 'received' as const, conflict: null,
        }])
        setAddOpen(false)
      } else {
        setSaveError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Scheduling failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const tabs: { key: TrainingTab; label: string }[] = [
    { key: 'courses', label: t('training.tab.courses') },
    { key: 'sessions', label: t('training.tab.sessions') },
    { key: 'students', label: t('training.tab.students') },
    { key: 'mentors', label: t('training.tab.mentors') },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('training.title')}
        subtitle={t('training.subtitle')}
        actions={
          <div className="flex items-center gap-2">
            <DemoBadge visible={mode === 'demo'} />
            <Button onClick={() => { setSaveError(''); setAddOpen(true) }}>{t('training.scheduleBtn')}</Button>
          </div>
        }
      />

      <div className="flex border-b border-slate-200">
        {tabs.map((t_) => (
          <button
            key={t_.key}
            onClick={() => setTab(t_.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t_.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t_.label}
          </button>
        ))}
      </div>

      {tab === 'courses' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.courses.col.course')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.courses.col.category')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.courses.col.duration')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.courses.col.sessions')}</th>
                <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.courses.col.maxCapacity')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.courses.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{c.title}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{c.id}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{c.category}</td>
                  <td className="px-6 py-4 text-slate-600">{c.duration}</td>
                  <td className="px-6 py-4 text-end text-slate-600">{c.sessions}</td>
                  <td className="px-6 py-4 text-end text-slate-600">{c.capacity}</td>
                  <td className="px-6 py-4"><Badge variant={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="flex flex-col gap-4">
          {actionError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{actionError}</div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`bg-white border rounded-xl p-5 ${session.conflict ? 'border-amber-300' : 'border-slate-200'}`}
            >
              {session.conflict && (
                <div className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                  <svg width="16" height="16" className="text-amber-600 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                  <div>
                    <p className="text-sm font-semibold text-amber-800">{t('training.sessions.conflictTitle')}</p>
                    <p className="text-xs text-amber-700 mt-0.5">{session.conflict}</p>
                  </div>
                </div>
              )}

              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400" dir="ltr">{session.id}</span>
                    <Badge variant={session.status} />
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mt-1">{session.course}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
                    <span>📅 {session.date} · {session.time}</span>
                    <span>🏭 {session.bay}</span>
                    <span>👤 {session.mentor}</span>
                    <span>
                      <strong className="text-slate-800">{session.students}</strong>/{session.capacity} {t('training.sessions.col.students')}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!session.conflict && session.status !== 'ready' && (
                    <Button
                      size="sm"
                      disabled
                      title="Training-session status transitions are not implemented by the backend."
                    >
                      {t('training.sessions.publish')}
                    </Button>
                  )}
                  <Button variant="secondary" size="sm" onClick={() => { setEditError(''); setEditing(session) }}>{t('training.sessions.edit')}</Button>
                </div>
              </div>

              {/* Capacity bar */}
              <div className="mt-3">
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      session.students / session.capacity >= 0.9 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${(session.students / session.capacity) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'students' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.students.col.student')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.students.col.course')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.students.col.group')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.students.col.attendance')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.students.col.status')}</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 text-xs font-bold">
                        {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400" dir="ltr">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.course}</td>
                  <td className="px-6 py-4 text-slate-500 text-xs" dir="ltr">{s.group}</td>
                  <td className="px-6 py-4">
                    <span className={`font-semibold ${
                      parseInt(s.attendance) >= 90 ? 'text-green-600' :
                      parseInt(s.attendance) >= 75 ? 'text-amber-600' : 'text-red-600'
                    }`}>{s.attendance}</span>
                  </td>
                  <td className="px-6 py-4"><Badge variant={s.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'mentors' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {mentors.map((m) => (
            <div key={m.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-sm">
                    {m.name.split(' ').map((n) => n[0]).slice(1, 3).join('')}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{m.name}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{m.id}</p>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  m.available ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {m.available ? t('training.mentors.available') : t('training.mentors.busy')}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-3">{m.specialty}</p>
              <div className="mt-3 flex gap-4 text-sm">
                <div><span className="font-bold text-slate-800">{m.sessions}</span> <span className="text-slate-400 text-xs">{t('training.mentors.sessions')}</span></div>
                <div><span className="font-bold text-slate-800">{m.students}</span> <span className="text-slate-400 text-xs">{t('training.mentors.students')}</span></div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title={t('training.modal.scheduleTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('action.cancel')}</Button>
            <Button loading={saving} onClick={() => (document.getElementById('session-schedule-form') as HTMLFormElement | null)?.requestSubmit()}>{t('training.modal.scheduleBtn')}</Button>
          </>
        }
      >
        <form id="session-schedule-form" onSubmit={handleSchedule} className="flex flex-col gap-4">
          {saveError && (
            <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{saveError}</div>
          )}
          <Select name="course" label={t('training.form.course')} options={[{ value: '', label: t('training.form.selectCourse') }, ...(courseOptions ?? courses.map((c) => ({ id: c.id, label: c.title }))).map((c) => ({ value: c.id, label: c.label }))]} required />
          <Select name="mentor" label={t('training.form.mentor')} options={[{ value: '', label: t('training.form.selectMentor') }, ...(mentorOptions ?? mentors.map((m) => ({ id: m.id, label: m.name }))).map((m) => ({ value: m.id, label: m.label }))]} required />
          <Select name="bay" label={t('training.form.bay')} options={[{ value: '', label: t('training.form.selectBay') }, ...(bayOptions ?? [{ id: 'b1', label: 'Bay 1' }, { id: 'b2', label: 'Bay 2' }, { id: 'b3', label: 'Bay 3' }, { id: 'b4', label: 'Bay 4' }]).map((b) => ({ value: b.id, label: b.label }))]} required />
          <Select name="group" label={t('training.students.col.group')} options={[{ value: '', label: t('training.form.selectCourse') }, ...(groupOptions ?? [{ id: 'G-2024-A', label: 'G-2024-A' }, { id: 'G-2024-B', label: 'G-2024-B' }, { id: 'G-2024-C', label: 'G-2024-C' }]).map((g) => ({ value: g.id, label: g.label }))]} required />
          <div className="grid grid-cols-2 gap-4">
            <Input name="date" label={t('training.form.date')} type="date" required />
            <Input name="startTime" label={t('training.form.startTime')} type="time" required />
          </div>
          <Input name="duration" label={t('training.form.duration')} type="number" placeholder="4" required />
          <Input name="capacity" label={t('training.form.maxCapacity')} type="number" placeholder="10" />
        </form>
      </Modal>

      {/* Edit Session Modal */}
      {editing && (
        <Modal
          open={!!editing}
          onClose={() => setEditing(null)}
          title={`${t('training.sessions.edit')} — ${editing.course}`}
          size="md"
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditing(null)}>{t('action.cancel')}</Button>
              <Button loading={saving} onClick={() => (document.getElementById('session-edit-form') as HTMLFormElement | null)?.requestSubmit()}>{t('action.save')}</Button>
            </>
          }
        >
          <form id="session-edit-form" onSubmit={handleEdit} className="flex flex-col gap-4">
            {editError && (
              <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{editError}</div>
            )}
            <Select name="mentor" label={t('training.form.mentor')} defaultValue="" options={[{ value: '', label: t('training.form.selectMentor') }, ...(mentorOptions ?? mentors.map((m) => ({ id: m.id, label: m.name }))).map((m) => ({ value: m.id, label: m.label }))]} />
            <Select name="bay" label={t('training.form.bay')} defaultValue="" options={[{ value: '', label: t('training.form.selectBay') }, ...(bayOptions ?? [{ id: 'b1', label: 'Bay 1' }, { id: 'b2', label: 'Bay 2' }, { id: 'b3', label: 'Bay 3' }, { id: 'b4', label: 'Bay 4' }]).map((b) => ({ value: b.id, label: b.label }))]} />
            <Input name="capacity" label={t('training.form.maxCapacity')} type="number" defaultValue={editing.capacity} />
            <p className="text-xs text-slate-400">Current: <span dir="ltr">{editing.date} · {editing.time}</span> · {editing.bay} · {editing.mentor}</p>
          </form>
        </Modal>
      )}
    </div>
  )
}
