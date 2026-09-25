import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { DemoBadge } from '../components/common/DemoBadge'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'

type TrainingTab = 'courses' | 'sessions' | 'students' | 'mentors'

interface TrainingSession {
  id: string
  course: string
  mentor: string
  bay: string
  date: string
  time: string
  students: number
  capacity: number
  status: 'in-progress' | 'received'
  conflict: string | null
}

const courses = [
  { id: 'CRS-001', title: 'Engine Overhaul Basics', category: 'Mechanical', duration: '40 hours', sessions: 5, capacity: 10, status: 'active' as const },
  { id: 'CRS-002', title: 'Brake System Inspection', category: 'Brakes', duration: '16 hours', sessions: 3, capacity: 8, status: 'active' as const },
  { id: 'CRS-003', title: 'Electrical Diagnostics & ECU', category: 'Electrical', duration: '32 hours', sessions: 4, capacity: 12, status: 'active' as const },
  { id: 'CRS-004', title: 'AC System Service', category: 'AC', duration: '24 hours', sessions: 3, capacity: 8, status: 'active' as const },
  { id: 'CRS-005', title: 'Transmission Overhaul', category: 'Transmission', duration: '48 hours', sessions: 6, capacity: 6, status: 'inactive' as const },
]

const sessionsSeed: TrainingSession[] = [
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
  const { roles } = useAuth()
  const { showToast } = useToast()
  // Students browse courses/sessions read-only; scheduling and publishing
  // stay with the Training Supervisor. Backend roles decide.
  const canManage = !roles.includes('STUDENT')
  const [tab, setTab] = useState<TrainingTab>('sessions')
  const [sessions, setSessions] = useState<TrainingSession[]>(sessionsSeed)
  const [addOpen, setAddOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [schedForm, setSchedForm] = useState({
    course: '', mentor: '', bay: '', date: '', startTime: '', duration: '', maxCapacity: '',
  })
  const [schedError, setSchedError] = useState('')
  const [publishTarget, setPublishTarget] = useState<TrainingSession | null>(null)

  const openSchedule = () => {
    setEditingId(null)
    setSchedForm({ course: '', mentor: '', bay: '', date: '', startTime: '', duration: '', maxCapacity: '' })
    setSchedError('')
    setAddOpen(true)
  }

  const openEdit = (s: TrainingSession) => {
    setEditingId(s.id)
    setSchedForm({
      course: courses.find((c) => c.title === s.course)?.id ?? s.course,
      mentor: mentors.find((m) => m.name === s.mentor)?.id ?? s.mentor,
      bay: s.bay,
      date: s.date,
      startTime: s.time.split('–')[0] || '',
      duration: '',
      maxCapacity: String(s.capacity),
    })
    setSchedError('')
    setAddOpen(true)
  }

  /** Detects a bay or mentor clash with another scheduled session. */
  const findConflict = (draft: typeof schedForm, ignoreId: string | null): string | null => {
    const clash = sessions.find(
      (s) =>
        s.id !== ignoreId &&
        s.date === draft.date &&
        (s.bay === draft.bay || s.mentor === draft.mentor),
    )
    if (!clash) return null
    return clash.bay === draft.bay
      ? `${draft.bay} is already booked by "${clash.course}" on ${clash.date}`
      : `${draft.mentor} already has "${clash.course}" on ${clash.date}`
  }

  const saveSession = () => {
    if (!schedForm.course || !schedForm.mentor || !schedForm.bay || !schedForm.date || !schedForm.startTime) {
      setSchedError('Course, mentor, bay, date and start time are required.')
      return
    }
    if (editingId) {
      const conflict = findConflict(schedForm, editingId)
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                course: schedForm.course,
                mentor: schedForm.mentor,
                bay: schedForm.bay,
                date: schedForm.date,
                time: schedForm.startTime,
                capacity: Number(schedForm.maxCapacity) > 0 ? Number(schedForm.maxCapacity) : s.capacity,
                conflict,
              }
            : s,
        ),
      )
      showToast(
        'success',
        'Session updated',
        conflict ? 'Saved with an unresolved conflict — it cannot be published.' : editingId,
      )
    } else {
      const conflict = findConflict(schedForm, null)
      const nextNum = Math.max(...sessions.map((s) => Number(s.id.slice(-3)))) + 1
      const id = `SES-${String(nextNum).padStart(3, '0')}`
      const courseLabel = courses.find((c) => c.id === schedForm.course)?.title ?? schedForm.course
      const mentorLabel = mentors.find((m) => m.id === schedForm.mentor)?.name ?? schedForm.mentor
      setSessions((prev) => [
        ...prev,
        {
          id,
          course: courseLabel,
          mentor: mentorLabel,
          bay: schedForm.bay,
          date: schedForm.date,
          time: schedForm.startTime,
          students: 0,
          capacity: Number(schedForm.maxCapacity) > 0 ? Number(schedForm.maxCapacity) : 10,
          status: 'received',
          conflict,
        },
      ])
      showToast(
        conflict ? 'info' : 'success',
        conflict ? 'Session saved with conflict' : 'Session scheduled',
        conflict ?? id,
      )
    }
    setAddOpen(false)
  }

  const confirmPublish = () => {
    if (!publishTarget) return
    if (publishTarget.conflict) {
      showToast('error', 'Cannot publish', 'Resolve the scheduling conflict first.')
      setPublishTarget(null)
      return
    }
    setSessions((prev) =>
      prev.map((s) => (s.id === publishTarget.id ? { ...s, status: 'in-progress' } : s)),
    )
    showToast('success', 'Session published', publishTarget.id)
    setPublishTarget(null)
  }

  const setSchedField = (key: keyof typeof schedForm, value: string) => {
    setSchedForm((f) => ({ ...f, [key]: value }))
    setSchedError('')
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
        badge={<DemoBadge />}
        actions={
          canManage ? (
            <Button onClick={openSchedule}>{t('training.scheduleBtn')}</Button>
          ) : undefined
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
                  {!session.conflict && canManage && session.status === 'received' && (
                    <Button size="sm" onClick={() => setPublishTarget(session)}>{t('training.sessions.publish')}</Button>
                  )}
                  {canManage && <Button variant="secondary" size="sm" onClick={() => openEdit(session)}>{t('training.sessions.edit')}</Button>}
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
        title={editingId ? t('training.sessions.edit') : t('training.modal.scheduleTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>{t('action.cancel')}</Button>
            <Button onClick={saveSession}>{editingId ? t('action.save') : t('training.modal.scheduleBtn')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label={t('training.form.course')} value={schedForm.course} onChange={(e) => setSchedField('course', e.target.value)} options={[{ value: '', label: t('training.form.selectCourse') }, ...courses.map((c) => ({ value: c.id, label: c.title }))]} required />
          <Select label={t('training.form.mentor')} value={schedForm.mentor} onChange={(e) => setSchedField('mentor', e.target.value)} options={[{ value: '', label: t('training.form.selectMentor') }, ...mentors.map((m) => ({ value: m.id, label: m.name }))]} required />
          <Select label={t('training.form.bay')} value={schedForm.bay} onChange={(e) => setSchedField('bay', e.target.value)} options={[{ value: '', label: t('training.form.selectBay') }, { value: 'Bay 1', label: 'Bay 1' }, { value: 'Bay 2', label: 'Bay 2' }, { value: 'Bay 3', label: 'Bay 3' }, { value: 'Bay 4', label: 'Bay 4' }]} required />
          <div className="grid grid-cols-2 gap-4">
            <Input label={t('training.form.date')} type="date" value={schedForm.date} onChange={(e) => setSchedField('date', e.target.value)} required />
            <Input label={t('training.form.startTime')} type="time" value={schedForm.startTime} onChange={(e) => setSchedField('startTime', e.target.value)} required />
          </div>
          <Input label={t('training.form.duration')} type="number" value={schedForm.duration} onChange={(e) => setSchedField('duration', e.target.value)} placeholder="4" />
          <Input label={t('training.form.maxCapacity')} type="number" value={schedForm.maxCapacity} onChange={(e) => setSchedField('maxCapacity', e.target.value)} placeholder="10" />
          {schedError && <p className="text-xs text-red-600">{schedError}</p>}
        </div>
      </Modal>

      {/* Publish confirmation — blocked while a conflict exists */}
      <ConfirmDialog
        open={!!publishTarget}
        title={t('training.sessions.publish')}
        message={publishTarget ? `Publish ${publishTarget.id} (${publishTarget.course})? Students and mentors will be notified.` : ''}
        confirmLabel={t('training.sessions.publish')}
        onConfirm={confirmPublish}
        onCancel={() => setPublishTarget(null)}
      />
    </div>
  )
}
