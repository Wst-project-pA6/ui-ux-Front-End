import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input, Select } from '../ui/Input'
import { DemoBadge } from '../ui/ApiState'
import { useLang } from '../../i18n/LanguageContext'
import { useRole } from '../../context/RoleContext'
import { useAuth } from '../../context/AuthContext'

type MentorTab = 'sessions' | 'groups' | 'attendance' | 'assessments' | 'returned'
type AttendanceMark = 'present' | 'late' | 'absent'
type EntryResult = 'pass' | 'fail' | 'needs-improvement'

interface AssignedStudent {
  id: string
  name: string
  group: string
}

interface MentorSession {
  id: string
  course: string
  date: string
  time: string
  bay: string
  group: string
  students: number
}

interface MentorGroup {
  id: string
  name: string
  course: string
  students: AssignedStudent[]
}

interface AssessmentEntry {
  id: string
  sessionId: string
  student: string
  task: string
  result: EntryResult
  timeOnTask: string
  note: string
  status: 'pending' | 'signed'
}

interface ReturnedEntry extends AssessmentEntry {
  returnReason: string
}

// Isolated mock data — ONLY assigned sessions/groups/students (UC-17 scope).
// Replaced by the official Training API contract when it arrives.
const mentorSessions: MentorSession[] = [
  { id: 'SES-001', course: 'Engine Overhaul Basics', date: 'Mon 16 Sep 2024', time: '09:00 – 12:00', bay: 'Bay 2', group: 'G-2024-A', students: 8 },
  { id: 'SES-002', course: 'Brake System Inspection', date: 'Tue 17 Sep 2024', time: '14:00 – 17:00', bay: 'Bay 4', group: 'G-2024-B', students: 6 },
]

const mentorGroups: MentorGroup[] = [
  {
    id: 'G-2024-A',
    name: 'Group A — Engine',
    course: 'Engine Overhaul Basics',
    students: [
      { id: 'STU-001', name: 'Abdullah Al-Faraj', group: 'G-2024-A' },
      { id: 'STU-003', name: 'Turki Al-Dosari', group: 'G-2024-A' },
    ],
  },
  {
    id: 'G-2024-B',
    name: 'Group B — Brakes',
    course: 'Brake System Inspection',
    students: [{ id: 'STU-002', name: 'Lama Al-Saqr', group: 'G-2024-B' }],
  },
]

const taskLibrary = [
  'Oil Change Procedure',
  'Air Filter Inspection',
  'Brake Pad Measurement',
  'Rotor Inspection',
  'OBD-II Fault Reading',
]

const seedEntries: AssessmentEntry[] = [
  { id: 'ASS-001', sessionId: 'SES-001', student: 'Abdullah Al-Faraj', task: 'Oil Change Procedure', result: 'pass', timeOnTask: '45 min', note: 'Good understanding.', status: 'signed' },
  { id: 'ASS-002', sessionId: 'SES-002', student: 'Lama Al-Saqr', task: 'Brake Pad Measurement', result: 'needs-improvement', timeOnTask: '62 min', note: 'Needs more practice.', status: 'pending' },
]

const seedReturned: ReturnedEntry[] = [
  {
    id: 'ASS-009', sessionId: 'SES-001', student: 'Turki Al-Dosari', task: 'Air Filter Inspection',
    result: 'fail', timeOnTask: '20 min', note: 'Incomplete inspection.', status: 'pending',
    returnReason: 'Time-on-task missing evidence photo — please attach evidence and resubmit.',
  },
]

const ownGroupRisks = [
  { id: 'RSK-01', group: 'G-2024-A', text: '2 students below 80% attendance — completion risk flagged.', level: 'medium' as const },
]

/**
 * Mentor experience of the shared Training module (UC-17/UC-18 mentor half).
 * Assigned scope only; attendance + result entry; correct-and-resubmit for
 * returned results. No sign-off (D26 forbids signing own entries), no
 * supervisor administration, no unrelated groups/students.
 */
export default function MentorView() {
  const { t } = useLang()
  const { config } = useRole()
  const { mode } = useAuth()
  const [tab, setTab] = useState<MentorTab>('sessions')
  const [notice, setNotice] = useState('')

  const [attendanceSession, setAttendanceSession] = useState('SES-001')
  const [marks, setMarks] = useState<Record<string, AttendanceMark>>({})
  const [entries, setEntries] = useState<AssessmentEntry[]>(seedEntries)
  const [returned, setReturned] = useState<ReturnedEntry[]>(seedReturned)
  const [correcting, setCorrecting] = useState<ReturnedEntry | null>(null)

  // Entry form
  const [fSession, setFSession] = useState('SES-001')
  const [fStudent, setFStudent] = useState('')
  const [fTask, setFTask] = useState('')
  const [fResult, setFResult] = useState<EntryResult>('pass')
  const [fTime, setFTime] = useState('')
  const [fNote, setFNote] = useState('')
  const [fError, setFError] = useState('')

  // Correct form
  const [cResult, setCResult] = useState<EntryResult>('pass')
  const [cTime, setCTime] = useState('')
  const [cNote, setCNote] = useState('')

  const tabs: { id: MentorTab; label: string }[] = [
    { id: 'sessions', label: t('training.mentor.tabSessions') },
    { id: 'groups', label: t('training.mentor.tabGroups') },
    { id: 'attendance', label: t('training.mentor.tabAttendance') },
    { id: 'assessments', label: t('training.mentor.tabAssessments') },
    { id: 'returned', label: t('training.mentor.tabReturned') },
  ]

  const sessionStudents = (sessionId: string): AssignedStudent[] => {
    const session = mentorSessions.find((s) => s.id === sessionId)
    const group = mentorGroups.find((g) => g.id === session?.group)
    return group?.students ?? []
  }

  const saveAttendance = () => {
    const students = sessionStudents(attendanceSession)
    const marked = students.filter((s) => marks[`${attendanceSession}:${s.id}`]).length
    setNotice(`${t('training.mentor.attendanceSaved')} (${marked}/${students.length})`)
  }

  const submitEntry = () => {
    if (!fStudent || !fTask || !fTime.trim()) {
      setFError(t('training.mentor.entryRequired'))
      return
    }
    const student = sessionStudents(fSession).find((s) => s.id === fStudent)
    setEntries((prev) => [
      {
        id: `ASS-${String(prev.length + 10).padStart(3, '0')}`,
        sessionId: fSession,
        student: student?.name ?? fStudent,
        task: fTask,
        result: fResult,
        timeOnTask: fTime.trim(),
        note: fNote.trim(),
        status: 'pending',
      },
      ...prev,
    ])
    setNotice(t('training.mentor.entrySaved'))
    setFStudent('')
    setFTask('')
    setFTime('')
    setFNote('')
    setFError('')
  }

  const openCorrect = (entry: ReturnedEntry) => {
    setCorrecting(entry)
    setCResult(entry.result)
    setCTime(entry.timeOnTask)
    setCNote(entry.note)
  }

  const resubmit = () => {
    if (!correcting || !cTime.trim()) return
    setReturned((prev) => prev.filter((r) => r.id !== correcting.id))
    setEntries((prev) => [
      { ...correcting, result: cResult, timeOnTask: cTime.trim(), note: cNote.trim(), status: 'pending' },
      ...prev,
    ])
    setNotice(t('training.mentor.resubmitted'))
    setCorrecting(null)
  }

  return (
    <div className="space-y-5">
      {notice && (
        <div role="status" className="px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm flex items-center justify-between gap-3">
          <span>{notice}</span>
          <button onClick={() => setNotice('')} aria-label="Dismiss" className="text-green-500 hover:text-green-700 font-bold">×</button>
        </div>
      )}
      {/* Mentor card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {config.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{config.userName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('training.mentor.assignedOnly')}</p>
        </div>
        <DemoBadge visible={mode === 'demo'} />
        <div className="hidden sm:flex flex-col items-end gap-1">
          <span className="text-xs text-slate-400">{t('training.mentor.sessionsCount')}: <strong className="text-slate-700">{mentorSessions.length}</strong></span>
          <span className="text-xs text-slate-400">{t('training.mentor.groupsCount')}: <strong className="text-slate-700">{mentorGroups.length}</strong></span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === tabItem.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tabItem.label}
            {tabItem.id === 'returned' && returned.length > 0 && (
              <span className="ms-2 inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">
                {returned.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* My Sessions */}
      {tab === 'sessions' && (
        <div className="flex flex-col gap-3">
          {mentorSessions.map((s) => (
            <div key={s.id} className="bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-slate-400" dir="ltr">{s.id}</p>
                  <p className="font-semibold text-slate-900 text-sm mt-0.5">{s.course}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.date} · {s.time}</p>
                  <p className="text-xs text-slate-400">{s.bay} · <span dir="ltr">{s.group}</span> · {s.students} {t('training.mentor.studentsLabel')}</p>
                </div>
                <Badge variant="received" label={t('training.mentor.assigned')} showDot={false} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* My Groups */}
      {tab === 'groups' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {mentorGroups.map((g) => (
            <div key={g.id} className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="font-semibold text-slate-900 text-sm">{g.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{g.course} · <span dir="ltr">{g.id}</span></p>
              <div className="mt-3 flex flex-col gap-2">
                {g.students.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-2 border border-slate-100 rounded-lg">
                    <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-green-700 text-xs font-bold">
                      {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">{s.name}</p>
                      <p className="text-xs text-slate-400" dir="ltr">{s.id}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {/* Risk flags — own groups only */}
          <div className="md:col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-2">{t('training.mentor.riskTitle')}</p>
            {ownGroupRisks.map((r) => (
              <p key={r.id} className="text-xs text-amber-700">
                <span dir="ltr">{r.group}</span> · {r.text}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Attendance */}
      {tab === 'attendance' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium text-slate-700">{t('training.mentor.sessionLabel')}</span>
            <select
              value={attendanceSession}
              onChange={(e) => setAttendanceSession(e.target.value)}
              className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {mentorSessions.map((s) => (
                <option key={s.id} value={s.id}>{s.id} — {s.course}</option>
              ))}
            </select>
            <Button size="sm" className="ms-auto" onClick={saveAttendance}>{t('training.mentor.saveAttendance')}</Button>
          </div>
          <div className="divide-y divide-slate-50">
            {sessionStudents(attendanceSession).map((s) => {
              const key = `${attendanceSession}:${s.id}`
              const mark = marks[key] ?? 'present'
              return (
                <div key={s.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-400" dir="ltr">{s.id}</p>
                  </div>
                  <div className="flex gap-1">
                    {(['present', 'late', 'absent'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMarks((prev) => ({ ...prev, [key]: m }))}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                          mark === m
                            ? m === 'present' ? 'bg-green-600 text-white' : m === 'late' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Assessments — entry only, never sign-off */}
      {tab === 'assessments' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm font-semibold text-slate-900 mb-3">{t('training.mentor.enterResult')}</p>
            {fError && <p role="alert" className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{fError}</p>}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select label={t('training.mentor.sessionLabel')} value={fSession} onChange={(e) => setFSession(e.target.value)}
                options={mentorSessions.map((s) => ({ value: s.id, label: `${s.id} — ${s.course}` }))} required />
              <Select label={t('training.mentor.studentLabel')} value={fStudent} onChange={(e) => setFStudent(e.target.value)}
                options={[{ value: '', label: t('training.mentor.selectStudent') }, ...sessionStudents(fSession).map((s) => ({ value: s.id, label: s.name }))]} required />
              <Select label={t('training.mentor.taskLabel')} value={fTask} onChange={(e) => setFTask(e.target.value)}
                options={[{ value: '', label: t('training.mentor.selectTask') }, ...taskLibrary.map((task) => ({ value: task, label: task }))]} required />
              <Select label={t('training.mentor.resultLabel')} value={fResult} onChange={(e) => setFResult(e.target.value as EntryResult)}
                options={[
                  { value: 'pass', label: t('badge.pass') },
                  { value: 'fail', label: t('badge.fail') },
                  { value: 'needs-improvement', label: t('badge.needs-improvement') },
                ]} required />
              <Input label={t('training.mentor.timeLabel')} value={fTime} onChange={(e) => setFTime(e.target.value)} placeholder="45 min" required />
              <Input label={t('training.mentor.noteLabel')} value={fNote} onChange={(e) => setFNote(e.target.value)} placeholder="…" />
            </div>
            <Button size="sm" className="mt-4" onClick={submitEntry}>{t('training.mentor.submitResult')}</Button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.mentor.studentLabel')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.mentor.taskLabel')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.mentor.resultLabel')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.mentor.statusLabel')}</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                      <td className="px-6 py-3">
                        <p className="font-medium text-slate-800">{entry.student}</p>
                        <p className="text-xs text-slate-400" dir="ltr">{entry.id} · {entry.sessionId}</p>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{entry.task} <span className="text-xs text-slate-400">· {entry.timeOnTask}</span></td>
                      <td className="px-6 py-3"><Badge variant={entry.result} /></td>
                      <td className="px-6 py-3">
                        {entry.status === 'signed' ? (
                          <span className="text-xs text-green-600 font-medium">{t('training.mentor.signed')}</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">{t('training.mentor.pendingSignOff')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Returned for correction */}
      {tab === 'returned' && (
        <div className="flex flex-col gap-3">
          {returned.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl px-6 py-12 text-center">
              <p className="text-sm font-semibold text-slate-700">{t('training.mentor.noReturned')}</p>
            </div>
          )}
          {returned.map((r) => (
            <div key={r.id} className="bg-white border border-amber-300 rounded-xl p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">{r.student} — {r.task}</p>
                  <p className="text-xs text-slate-400 mt-0.5" dir="ltr">{r.id} · {r.sessionId}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => openCorrect(r)}>{t('training.mentor.correct')}</Button>
              </div>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-amber-800">{t('training.mentor.returnReason')}</p>
                <p className="text-xs text-amber-700 mt-0.5">{r.returnReason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Correct & resubmit */}
      <Modal
        open={!!correcting}
        onClose={() => setCorrecting(null)}
        title={t('training.mentor.correctTitle')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCorrecting(null)}>{t('action.cancel')}</Button>
            <Button onClick={resubmit} disabled={!cTime.trim()}>{t('training.mentor.resubmit')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Select label={t('training.mentor.resultLabel')} value={cResult} onChange={(e) => setCResult(e.target.value as EntryResult)}
            options={[
              { value: 'pass', label: t('badge.pass') },
              { value: 'fail', label: t('badge.fail') },
              { value: 'needs-improvement', label: t('badge.needs-improvement') },
            ]} required />
          <Input label={t('training.mentor.timeLabel')} value={cTime} onChange={(e) => setCTime(e.target.value)} required />
          <Input label={t('training.mentor.noteLabel')} value={cNote} onChange={(e) => setCNote(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}
