import React, { useState } from 'react'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from '../components/ui/PageHeader'
import { useRole } from '../context/RoleContext'
import { DemoBadge } from '../components/ui/ApiState'
import { useAuth } from '../context/AuthContext'

const studentId = 'STU-2024-019'
const course = 'Automotive Mechanics — Level 2'
const group = 'Group B'

const sessions = [
  {
    id: 'SES-001',
    title: 'Engine Overhaul Basics',
    date: 'Mon 16 Sep 2024',
    time: '09:00 – 12:00',
    bay: 'Bay 2',
    mentor: 'Eng. Sami Al-Rashidi',
    attendance: 'present' as const,
    tasks: [
      { name: 'Disassemble engine block', result: 'pass' as const, timeOnTask: '45 min' },
      { name: 'Identify worn components', result: 'pass' as const, timeOnTask: '30 min' },
      { name: 'Reassemble with correct torque', result: 'needs-improvement' as const, timeOnTask: '55 min' },
    ],
    mentorNote: 'Good theoretical understanding. Needs more practice with torque specifications.',
    signed: true,
  },
  {
    id: 'SES-002',
    title: 'Brake System Inspection',
    date: 'Tue 17 Sep 2024',
    time: '14:00 – 17:00',
    bay: 'Bay 4',
    mentor: 'Eng. Fatima Hassan',
    attendance: 'present' as const,
    tasks: [
      { name: 'Inspect brake pads and rotors', result: 'pass' as const, timeOnTask: '40 min' },
      { name: 'Measure rotor runout', result: 'pass' as const, timeOnTask: '20 min' },
      { name: 'Bleed brake lines', result: 'pass' as const, timeOnTask: '35 min' },
    ],
    mentorNote: 'Excellent attention to safety procedures throughout the session.',
    signed: true,
  },
  {
    id: 'SES-003',
    title: 'Electrical Diagnostics',
    date: 'Wed 18 Sep 2024',
    time: '10:00 – 13:00',
    bay: 'Bay 1',
    mentor: 'Eng. Waleed Khatib',
    attendance: 'late' as const,
    tasks: [
      { name: 'Use OBD-II scanner', result: 'pass' as const, timeOnTask: '25 min' },
      { name: 'Read and interpret fault codes', result: 'needs-improvement' as const, timeOnTask: '40 min' },
      { name: 'Locate and test fuse box', result: 'fail' as const, timeOnTask: '30 min' },
    ],
    mentorNote: 'Arrived late which affected preparation. Needs additional practice with fault code interpretation.',
    signed: true,
  },
  {
    id: 'SES-004',
    title: 'Suspension & Steering',
    date: 'Thu 19 Sep 2024',
    time: '09:00 – 12:00',
    bay: 'Bay 3',
    mentor: 'Eng. Sami Al-Rashidi',
    attendance: 'pending' as const,
    tasks: [],
    mentorNote: '',
    signed: false,
  },
  {
    id: 'SES-005',
    title: 'Transmission Fundamentals',
    date: 'Mon 23 Sep 2024',
    time: '14:00 – 17:00',
    bay: 'Bay 2',
    mentor: 'Eng. Fatima Hassan',
    attendance: 'pending' as const,
    tasks: [],
    mentorNote: '',
    signed: false,
  },
]

const competencies = [
  { area: 'Engine Systems', coverage: 78, status: 'in-progress' as const },
  { area: 'Braking Systems', coverage: 100, status: 'ready' as const },
  { area: 'Electrical Systems', coverage: 45, status: 'in-progress' as const },
  { area: 'Suspension & Steering', coverage: 20, status: 'received' as const },
  { area: 'Transmission', coverage: 0, status: 'received' as const },
]

const resultColor = (r: 'pass' | 'fail' | 'needs-improvement') =>
  r === 'pass'
    ? 'bg-green-100 text-green-700'
    : r === 'fail'
      ? 'bg-red-100 text-red-700'
      : 'bg-amber-100 text-amber-700'

const resultLabel = (r: 'pass' | 'fail' | 'needs-improvement') =>
  r === 'pass' ? 'Pass' : r === 'fail' ? 'Fail' : 'Needs Improvement'

const attendanceColor = (a: 'present' | 'late' | 'absent' | 'pending') =>
  a === 'present'
    ? 'bg-green-100 text-green-700'
    : a === 'late'
      ? 'bg-amber-100 text-amber-700'
      : a === 'absent'
        ? 'bg-red-100 text-red-700'
        : 'bg-slate-100 text-slate-500'

const attendanceLabel = (a: 'present' | 'late' | 'absent' | 'pending') =>
  a === 'present' ? 'Present' : a === 'late' ? 'Late' : a === 'absent' ? 'Absent' : 'Upcoming'

type Session = (typeof sessions)[0]

export default function MyTraining() {
  const { config } = useRole()
  const { mode } = useAuth()
  const [activeTab, setActiveTab] = useState<'sessions' | 'competencies' | 'certificate'>('sessions')
  const [selected, setSelected] = useState<Session | null>(null)
  const [downloadError, setDownloadError] = useState('')

  // Neither certificates nor export/download authorizations are implemented
  // in the supplied backend. Do not offer a request that would always 404.
  const handleDownloadCertificate = () => {
    setDownloadError('Certificate issuance and PDF download are not available from the current backend.')
  }

  const completedSessions = sessions.filter((s) => s.attendance !== 'pending').length
  const passRate = Math.round(
    (sessions
      .filter((s) => s.tasks.length > 0)
      .flatMap((s) => s.tasks)
      .filter((t) => t.result === 'pass').length /
      Math.max(
        1,
        sessions.filter((s) => s.tasks.length > 0).flatMap((s) => s.tasks).length
      )) *
    100
  )

  const avgCompetency = Math.round(competencies.reduce((s, c) => s + c.coverage, 0) / competencies.length)
  const certReady = competencies.every((c) => c.coverage >= 80)

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Training"
        subtitle={`${course} · ${group}`}
        actions={<DemoBadge visible={mode === 'demo'} />}
      />

      {/* Student card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {config.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{config.userName}</p>
          <p className="text-xs text-slate-400" dir="ltr">{studentId} · {group}</p>
          <p className="text-xs text-slate-500 mt-0.5">{course}</p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Sessions:</span>
            <span className="text-xs font-semibold text-slate-700">{completedSessions}/{sessions.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Pass rate:</span>
            <span className="text-xs font-semibold text-green-600">{passRate}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { id: 'sessions', label: 'Sessions & Tasks' },
          { id: 'competencies', label: 'Competencies' },
          { id: 'certificate', label: 'Certificate' },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="flex flex-col gap-3">
          {sessions.map((session) => (
            <button
              key={session.id}
              onClick={() => session.tasks.length > 0 ? setSelected(session) : undefined}
              className={`w-full text-start bg-white border border-slate-200 rounded-xl p-4 transition-all ${session.tasks.length > 0 ? 'hover:border-blue-300 hover:shadow-sm group cursor-pointer' : 'cursor-default'
                }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug">{session.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{session.date} · {session.time}</p>
                  <p className="text-xs text-slate-400">{session.bay} · {session.mentor}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${attendanceColor(session.attendance)}`}>
                    {attendanceLabel(session.attendance)}
                  </span>
                  {session.signed && (
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                      Signed
                    </span>
                  )}
                  {!session.signed && session.tasks.length > 0 && (
                    <span className="text-xs text-amber-600">Pending sign-off</span>
                  )}
                </div>
              </div>

              {session.tasks.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {session.tasks.map((task, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${resultColor(task.result)}`}>
                      {resultLabel(task.result)}
                    </span>
                  ))}
                  <span className="text-xs text-blue-600 font-medium ms-auto group-hover:underline">
                    View details →
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Competencies tab */}
      {activeTab === 'competencies' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">Competency Coverage</p>
            <span className="text-sm font-bold text-blue-600">{avgCompetency}% avg</span>
          </div>
          <div className="flex flex-col gap-4">
            {competencies.map((comp) => (
              <div key={comp.area}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-800">{comp.area}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={comp.status} />
                    <span className={`text-sm font-bold ${comp.coverage >= 80 ? 'text-green-600' : comp.coverage >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>{comp.coverage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${comp.coverage >= 80 ? 'bg-green-500' : comp.coverage >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                      }`}
                    style={{ width: `${comp.coverage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {!certReady && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800">Certificate not yet available</p>
              <p className="text-xs text-amber-700 mt-0.5">All competency areas must reach ≥ 80% coverage with signed supervisor results.</p>
            </div>
          )}
        </div>
      )}

      {/* Certificate tab */}
      {activeTab === 'certificate' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          {certReady ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.75">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              </div>
              <p className="text-lg font-bold text-slate-900 mb-1">Certificate Earned</p>
              <p className="text-sm text-slate-500">{course}</p>
              <p className="text-xs text-slate-400 mt-1">Issued: 20 Sep 2024</p>
              <button
                onClick={handleDownloadCertificate}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Download Certificate (PDF)
              </button>
              {downloadError && (
                <p role="alert" className="mt-2 text-xs text-red-600">{downloadError}</p>
              )}
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.75">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              </div>
              <p className="text-lg font-bold text-slate-900 mb-1">Not Yet Available</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">
                Your certificate will be issued once all competency areas are completed and signed off by your supervisor.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2">
                <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${avgCompetency}%` }} />
                </div>
                <span className="text-sm font-semibold text-slate-600">{avgCompetency}%</span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Session detail modal (read-only) */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50"
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <div>
                <p className="font-semibold text-slate-900">{selected.title}</p>
                <p className="text-xs text-slate-400">{selected.date} · {selected.mentor}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>

            <div className="p-5 flex flex-col gap-4">
              {/* Attendance */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Attendance</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${attendanceColor(selected.attendance)}`}>
                  {attendanceLabel(selected.attendance)}
                </span>
              </div>

              {/* Tasks */}
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Task Results</p>
                <div className="flex flex-col gap-2">
                  {selected.tasks.map((task, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                      <span className="text-sm text-slate-700 flex-1">{task.name}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-slate-400">{task.timeOnTask}</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${resultColor(task.result)}`}>
                          {resultLabel(task.result)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mentor note */}
              {selected.mentorNote && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Mentor Note</p>
                  <p className="text-sm text-slate-700">{selected.mentorNote}</p>
                </div>
              )}

              {/* Sign-off status */}
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${selected.signed ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                }`}>
                {selected.signed ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    Signed off by supervisor
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                    Pending supervisor sign-off
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
