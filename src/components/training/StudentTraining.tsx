import { useState } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { DemoBadge, EmptyState, LoadingRows } from '../ui/ApiState'
import { useLang } from '../../i18n/LanguageContext'
import { useRole } from '../../context/RoleContext'
import { useAuth } from '../../context/AuthContext'
import { useApiList } from '../../api/hooks'
import { assessmentsApi } from '../../api/resources'
import type { Assessment, AssessmentResult } from '../../api/types'

type StudentTab = 'sessions' | 'results' | 'progress' | 'certificate'

interface DemoTask {
  name: string
  result: 'pass' | 'fail' | 'needs-improvement'
  timeOnTask: string
}

interface DemoSession {
  id: string
  title: string
  date: string
  time: string
  bay: string
  mentor: string
  attendance: 'present' | 'late' | 'absent' | 'pending'
  tasks: DemoTask[]
  mentorNote: string
  signed: boolean
}

// Labeled offline demo data (same seed the student previously saw).
const demoSessions: DemoSession[] = [
  {
    id: 'SES-001',
    title: 'Engine Overhaul Basics',
    date: 'Mon 16 Sep 2024',
    time: '09:00 – 12:00',
    bay: 'Bay 2',
    mentor: 'Eng. Sami Al-Rashidi',
    attendance: 'present',
    tasks: [
      { name: 'Disassemble engine block', result: 'pass', timeOnTask: '45 min' },
      { name: 'Identify worn components', result: 'pass', timeOnTask: '30 min' },
      { name: 'Reassemble with correct torque', result: 'needs-improvement', timeOnTask: '55 min' },
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
    attendance: 'present',
    tasks: [
      { name: 'Inspect brake pads and rotors', result: 'pass', timeOnTask: '40 min' },
      { name: 'Measure rotor runout', result: 'pass', timeOnTask: '20 min' },
      { name: 'Bleed brake lines', result: 'pass', timeOnTask: '35 min' },
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
    attendance: 'late',
    tasks: [
      { name: 'Use OBD-II scanner', result: 'pass', timeOnTask: '25 min' },
      { name: 'Read and interpret fault codes', result: 'needs-improvement', timeOnTask: '40 min' },
      { name: 'Locate and test fuse box', result: 'fail', timeOnTask: '30 min' },
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
    attendance: 'pending',
    tasks: [],
    mentorNote: '',
    signed: false,
  },
]

const demoCompetencies = [
  { area: 'Engine Systems', coverage: 78, status: 'in-progress' as const },
  { area: 'Braking Systems', coverage: 100, status: 'ready' as const },
  { area: 'Electrical Systems', coverage: 45, status: 'in-progress' as const },
  { area: 'Suspension & Steering', coverage: 20, status: 'received' as const },
  { area: 'Transmission', coverage: 0, status: 'received' as const },
]

// Offline fallback rows use only verified contract fields (mapAssessment).
const demoResults: Assessment[] = [
  {
    id: 'ASS-001', sessionId: 'SES-001', studentId: 'STU-001', taskId: 'TSK-001',
    courseId: 'CRS-001', result: 'PASS', timeOnTaskMinutes: 45,
    mentorNote: 'Good theoretical understanding.', assessedBy: 'MNT-001',
    assessedAt: '2024-09-16T10:30:00Z', signOffStatus: 'SIGNED_OFF',
    countsTowardCompletion: true, version: 2,
    createdAt: '2024-09-16T10:30:00Z', updatedAt: '2024-09-16T12:00:00Z',
    createdBy: 'MNT-001', updatedBy: 'SUP-001',
  },
  {
    id: 'ASS-002', sessionId: 'SES-002', studentId: 'STU-001', taskId: 'TSK-004',
    courseId: 'CRS-002', result: 'PASS', timeOnTaskMinutes: 40,
    assessedBy: 'MNT-002', assessedAt: '2024-09-17T15:00:00Z',
    signOffStatus: 'SIGNED_OFF', countsTowardCompletion: true, version: 2,
    createdAt: '2024-09-17T15:00:00Z', updatedAt: '2024-09-17T16:00:00Z',
    createdBy: 'MNT-002', updatedBy: 'SUP-001',
  },
  {
    id: 'ASS-003', sessionId: 'SES-003', studentId: 'STU-001', taskId: 'TSK-007',
    courseId: 'CRS-003', result: 'NEEDS_IMPROVEMENT', timeOnTaskMinutes: 40,
    mentorNote: 'Needs additional practice with fault code interpretation.',
    assessedBy: 'MNT-003', assessedAt: '2024-09-18T11:00:00Z',
    signOffStatus: 'PENDING', countsTowardCompletion: false, version: 1,
    createdAt: '2024-09-18T11:00:00Z', updatedAt: '2024-09-18T11:00:00Z',
    createdBy: 'MNT-003', updatedBy: 'MNT-003',
  },
]

const resultBadge: Record<AssessmentResult, 'pass' | 'fail' | 'needs-improvement'> = {
  PASS: 'pass',
  FAIL: 'fail',
  NEEDS_IMPROVEMENT: 'needs-improvement',
}

const attendanceStyle: Record<DemoSession['attendance'], string> = {
  present: 'bg-green-100 text-green-700',
  late: 'bg-amber-100 text-amber-700',
  absent: 'bg-red-100 text-red-700',
  pending: 'bg-slate-100 text-slate-500',
}

/**
 * Student experience of the shared Training module. Personal data only:
 * the backend restricts GET /assessments to the student's own records
 * (students.self), and this view never renders supervisor actions —
 * sign-off requires training.signoff, which students do not have.
 */
export default function StudentTraining() {
  const { t } = useLang()
  const { config } = useRole()
  const { mode } = useAuth()
  const [tab, setTab] = useState<StudentTab>('sessions')
  const [selected, setSelected] = useState<DemoSession | null>(null)

  // Same endpoint as the supervisor list, but the backend returns only the
  // authenticated student's own assessments. Offline -> labeled demo rows.
  const results = useApiList<Assessment>((q) => assessmentsApi.list(q), {
    fallbackItems: demoResults,
  })

  const tabs: { id: StudentTab; label: string }[] = [
    { id: 'sessions', label: t('training.tab.mySessions') },
    { id: 'results', label: t('training.tab.myResults') },
    { id: 'progress', label: t('training.tab.myProgress') },
    { id: 'certificate', label: t('training.tab.myCertificate') },
  ]

  const liveResults = results.isFallback ? demoResults : results.items
  const passCount = liveResults.filter((r) => r.result === 'PASS').length
  const passRate = liveResults.length > 0 ? Math.round((passCount / liveResults.length) * 100) : 0
  const avgCompetency = Math.round(
    demoCompetencies.reduce((s, c) => s + c.coverage, 0) / demoCompetencies.length,
  )
  const certReady = demoCompetencies.every((c) => c.coverage >= 80)

  const downloadCertificate = () => {
    window.setTimeout(() => window.print(), 350)
  }

  return (
    <div className="space-y-5">
      {/* Student card */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
          {config.initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{config.userName}</p>
          <p className="text-xs text-slate-500 mt-0.5">{t('training.student.ownRecordsOnly')}</p>
        </div>
        <DemoBadge visible={mode === 'demo' || results.isFallback} />
        <div className="hidden sm:flex flex-col items-end gap-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t('training.student.passRate')}:</span>
            <span className="text-xs font-semibold text-green-600">{passRate}%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400">{t('training.student.avgCoverage')}:</span>
            <span className="text-xs font-semibold text-blue-600">{avgCompetency}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.id}
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === tabItem.id
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {/* My Sessions */}
      {tab === 'sessions' && (
        <div className="flex flex-col gap-3">
          {demoSessions.map((session) => (
            <button
              key={session.id}
              onClick={() => (session.tasks.length > 0 ? setSelected(session) : undefined)}
              className={`w-full text-start bg-white border border-slate-200 rounded-xl p-4 transition-all ${
                session.tasks.length > 0
                  ? 'hover:border-blue-300 hover:shadow-sm group cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm leading-snug">{session.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{session.date} · {session.time}</p>
                  <p className="text-xs text-slate-400">{session.bay} · {session.mentor}</p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${attendanceStyle[session.attendance]}`}>
                    {session.attendance}
                  </span>
                  {session.signed && (
                    <span className="text-xs text-green-600">{t('training.student.signedOff')}</span>
                  )}
                  {!session.signed && session.tasks.length > 0 && (
                    <span className="text-xs text-amber-600">{t('training.student.pendingSignOff')}</span>
                  )}
                </div>
              </div>
              {session.tasks.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {session.tasks.map((task, i) => (
                    <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${attendanceStyle[task.result === 'pass' ? 'present' : task.result === 'fail' ? 'absent' : 'late']}`}>
                      {task.name}
                    </span>
                  ))}
                  <span className="text-xs text-blue-600 font-medium ms-auto group-hover:underline">
                    {t('training.student.viewDetails')} →
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* My Results (live, permission-scoped) */}
      {tab === 'results' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">{t('training.student.resultsTitle')}</h3>
            <DemoBadge visible={results.isFallback} />
          </div>
          {results.loading ? (
            <LoadingRows rows={3} />
          ) : results.error ? (
            <p role="alert" className="px-6 py-6 text-sm text-red-600">
              {results.error.code}: {results.error.message}
            </p>
          ) : liveResults.length === 0 ? (
            <EmptyState title={t('training.student.noResults')} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-50">
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">ID</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.student.resultCol')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.student.sessionCol')}</th>
                    <th className="px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.student.timeCol')}</th>
                    <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('training.student.signOffCol')}</th>
                  </tr>
                </thead>
                <tbody>
                  {liveResults.map((r) => (
                    <tr key={r.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                      <td className="px-6 py-4 font-mono text-xs text-slate-500" dir="ltr">{r.id}</td>
                      <td className="px-6 py-4"><Badge variant={resultBadge[r.result]} /></td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500" dir="ltr">{r.sessionId}</td>
                      <td className="px-6 py-4 text-end text-slate-600 text-xs" dir="ltr">{r.timeOnTaskMinutes} min</td>
                      <td className="px-6 py-4">
                        {r.signOffStatus === 'SIGNED_OFF' ? (
                          <span className="text-xs text-green-600 font-medium">{t('training.student.signedOff')}</span>
                        ) : (
                          <span className="text-xs text-amber-600 font-medium">{t('training.student.pendingSignOff')}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {liveResults.some((r) => r.mentorNote) && (
            <div className="px-6 py-4 border-t border-slate-100 flex flex-col gap-2">
              {liveResults.filter((r) => r.mentorNote).map((r) => (
                <div key={r.id} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400"><span className="font-mono" dir="ltr">{r.id}</span> · {t('training.student.mentorNote')}</p>
                  <p className="text-sm text-slate-700 mt-0.5">{r.mentorNote}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* My Progress */}
      {tab === 'progress' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-slate-900">{t('training.student.progressTitle')}</p>
            <div className="flex items-center gap-2">
              <DemoBadge visible={mode === 'demo'} />
              <span className="text-sm font-bold text-blue-600">{avgCompetency}% avg</span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            {demoCompetencies.map((comp) => (
              <div key={comp.area}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-slate-800">{comp.area}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={comp.status} />
                    <span className={`text-sm font-bold ${
                      comp.coverage >= 80 ? 'text-green-600' : comp.coverage >= 50 ? 'text-amber-600' : 'text-red-600'
                    }`}>{comp.coverage}%</span>
                  </div>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      comp.coverage >= 80 ? 'bg-green-500' : comp.coverage >= 50 ? 'bg-amber-500' : 'bg-blue-500'
                    }`}
                    style={{ width: `${comp.coverage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {!certReady && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg">
              <p className="text-xs font-semibold text-amber-800">{t('training.student.notEligible')}</p>
              <p className="text-xs text-amber-700 mt-0.5">{t('training.student.eligibilityNote')}</p>
            </div>
          )}
        </div>
      )}

      {/* Certificate */}
      {tab === 'certificate' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
          {certReady ? (
            <>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="1.75">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              </div>
              <p className="text-lg font-bold text-slate-900 mb-1">{t('training.student.certEarned')}</p>
              <Button size="sm" className="mt-4" onClick={downloadCertificate}>
                {t('training.student.downloadCert')}
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.75">
                  <circle cx="12" cy="8" r="6" />
                  <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11" />
                </svg>
              </div>
              <p className="text-lg font-bold text-slate-900 mb-1">{t('training.student.certPending')}</p>
              <p className="text-sm text-slate-500 max-w-xs mx-auto">{t('training.student.eligibilityNote')}</p>
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

      {/* Session detail (read-only) */}
      {selected && (
        <Modal open={!!selected} onClose={() => setSelected(null)} title={selected.title} size="md"
          footer={<Button variant="secondary" onClick={() => setSelected(null)}>{t('action.close')}</Button>}>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{t('training.student.attendance')}</span>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${attendanceStyle[selected.attendance]}`}>
                {selected.attendance}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">{t('training.student.tasks')}</p>
              <div className="flex flex-col gap-2">
                {selected.tasks.map((task, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700 flex-1">{task.name}</span>
                    <span className="text-xs text-slate-400">{task.timeOnTask}</span>
                    <Badge variant={task.result} />
                  </div>
                ))}
              </div>
            </div>
            {selected.mentorNote && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{t('training.student.mentorNote')}</p>
                <p className="text-sm text-slate-700">{selected.mentorNote}</p>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
