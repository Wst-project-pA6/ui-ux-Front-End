import React, { useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'

type AttendanceStatus = 'present' | 'absent' | 'late'
type AssessmentResult = 'pass' | 'fail' | 'needs-improvement'

interface Assessment {
  id: string
  student: string
  course: string
  session: string
  task: string
  attendance: AttendanceStatus
  result: AssessmentResult
  timeOnTask: string
  signed: boolean
  mentor: string
  date: string
}

const seedAssessments: Assessment[] = [
  { id: 'ASS-001', student: 'Abdullah Al-Faraj', course: 'Engine Overhaul Basics', session: 'SES-001', task: 'Oil Change Procedure', attendance: 'present' as AttendanceStatus, result: 'pass' as AssessmentResult, timeOnTask: '45 min', signed: true, mentor: 'Eng. Sami Al-Rashidi', date: 'Sep 19, 2024' },
  { id: 'ASS-002', student: 'Lama Al-Saqr', course: 'Brake System Inspection', session: 'SES-002', task: 'Brake Pad Measurement', attendance: 'present' as AttendanceStatus, result: 'needs-improvement' as AssessmentResult, timeOnTask: '62 min', signed: false, mentor: 'Eng. Fatima Hassan', date: 'Sep 19, 2024' },
  { id: 'ASS-003', student: 'Turki Al-Dosari', course: 'Engine Overhaul Basics', session: 'SES-001', task: 'Oil Change Procedure', attendance: 'late' as AttendanceStatus, result: 'pass' as AssessmentResult, timeOnTask: '55 min', signed: true, mentor: 'Eng. Sami Al-Rashidi', date: 'Sep 19, 2024' },
  { id: 'ASS-004', student: 'Maha Al-Otaibi', course: 'Electrical Diagnostics & ECU', session: 'SES-003', task: 'OBD-II Fault Reading', attendance: 'present' as AttendanceStatus, result: 'pass' as AssessmentResult, timeOnTask: '38 min', signed: false, mentor: 'Eng. Waleed Khatib', date: 'Sep 18, 2024' },
  { id: 'ASS-005', student: 'Abdullah Al-Faraj', course: 'Engine Overhaul Basics', session: 'SES-001', task: 'Air Filter Inspection', attendance: 'absent' as AttendanceStatus, result: 'fail' as AssessmentResult, timeOnTask: '—', signed: false, mentor: 'Eng. Sami Al-Rashidi', date: 'Sep 17, 2024' },
]

const attendanceBadgeStyle: Record<AttendanceStatus, string> = {
  present: 'bg-green-50 text-green-700 border border-green-200',
  absent: 'bg-red-50 text-red-700 border border-red-200',
  late: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function Assessments() {
  const { t } = useLang()
  const { showToast } = useToast()
  const [assessments, setAssessments] = useState<Assessment[]>(seedAssessments)
  const [search, setSearch] = useState('')
  const [courseFilter, setCourseFilter] = useState('')
  const [resultFilter, setResultFilter] = useState('')
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [signOffTarget, setSignOffTarget] = useState<Assessment | null>(null)

  const selected = assessments.find((a) => a.id === selectedId) ?? null
  const courses = Array.from(new Set(assessments.map((a) => a.course)))

  const filtered = assessments.filter((a) => {
    const q = search.trim().toLowerCase()
    const matchesSearch =
      !q ||
      a.student.toLowerCase().includes(q) ||
      a.course.toLowerCase().includes(q)
    return (
      matchesSearch &&
      (!courseFilter || a.course === courseFilter) &&
      (!resultFilter || a.result === resultFilter)
    )
  })

  const signOff = () => {
    if (!signOffTarget) return
    setAssessments((prev) =>
      prev.map((a) => (a.id === signOffTarget.id ? { ...a, signed: true } : a)),
    )
    showToast('success', 'Assessment signed off', `${signOffTarget.id} now counts toward certification.`)
    setSignOffTarget(null)
  }

  const attendanceLabel = (status: AttendanceStatus) => {
    if (status === 'present') return t('assessments.attendance.present')
    if (status === 'absent') return t('assessments.attendance.absent')
    return t('assessments.attendance.late')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('assessments.title')}
        subtitle={t('assessments.subtitle')}
        actions={
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700 font-medium">
            ⚠ {assessments.filter((a) => !a.signed).length} {t('assessments.unsignedBanner')}
          </div>
        }
      />

      <div className="flex items-center gap-3 flex-wrap">
        <SearchBar value={search} onChange={setSearch} placeholder={t('assessments.search')} />
        <select
          value={courseFilter}
          onChange={(e) => setCourseFilter(e.target.value)}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('assessments.filter.allCourses')}</option>
          {courses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={resultFilter}
          onChange={(e) => setResultFilter(e.target.value)}
          className="h-9 px-3 border border-slate-200 rounded-lg text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{t('assessments.filter.allResults')}</option>
          <option value="pass">{t('badge.pass')}</option>
          <option value="fail">{t('badge.fail')}</option>
          <option value="needs-improvement">{t('badge.needs-improvement')}</option>
        </select>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.student')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.courseTask')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.date')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.attendance')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.result')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.timeOnTask')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.signOff')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('assessments.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr
                key={a.id}
                className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                onClick={() => { setSelectedId(a.id); setDetailOpen(true) }}
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-800">{a.student}</p>
                  <p className="text-xs text-slate-400" dir="ltr">{a.id}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-slate-700">{a.course}</p>
                  <p className="text-xs text-slate-400">{a.task}</p>
                </td>
                <td className="px-6 py-4 text-slate-500 text-xs">{a.date}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${attendanceBadgeStyle[a.attendance]}`}>
                    {attendanceLabel(a.attendance)}
                  </span>
                </td>
                <td className="px-6 py-4"><Badge variant={a.result} /></td>
                <td className="px-6 py-4 text-slate-600 text-xs">{a.timeOnTask}</td>
                <td className="px-6 py-4">
                  {a.signed ? (
                    <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                      {t('assessments.signed')}
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      {t('assessments.pendingSignOff')}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div onClick={(e) => e.stopPropagation()}>
                    {!a.signed && (
                      <Button size="sm" variant="secondary" onClick={() => setSignOffTarget(a)}>{t('assessments.signOffBtn')}</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {selected && (
        <Modal
          open={detailOpen}
          onClose={() => { setDetailOpen(false); setSelectedId(null) }}
          title={`Assessment ${selected.id}`}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => { setDetailOpen(false); setSelectedId(null) }}>{t('action.close')}</Button>
              {!selected.signed && <Button onClick={() => setSignOffTarget(selected)}>{t('action.supervisorSignOff')}</Button>}
            </>
          }
        >
          <div className="flex flex-col gap-5">
            {!selected.signed && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-3">
                <svg width="16" height="16" className="text-amber-600 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                <div>
                  <p className="text-sm font-semibold text-amber-800">{t('assessments.modal.pendingTitle')}</p>
                  <p className="text-xs text-amber-700 mt-0.5">{t('assessments.modal.pendingDesc')}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('assessments.detail.student'), value: selected.student },
                { label: t('assessments.detail.course'), value: selected.course },
                { label: t('assessments.detail.session'), value: <span dir="ltr">{selected.session}</span> },
                { label: t('assessments.detail.task'), value: selected.task },
                { label: t('assessments.detail.mentor'), value: selected.mentor },
                { label: t('assessments.detail.date'), value: selected.date },
                { label: t('assessments.detail.attendance'), value: <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${attendanceBadgeStyle[selected.attendance]}`}>{attendanceLabel(selected.attendance)}</span> },
                { label: t('assessments.detail.timeOnTask'), value: selected.timeOnTask },
              ].map((item) => (
                <div key={item.label} className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400">{item.label}</p>
                  <div className="mt-0.5 text-sm font-medium text-slate-800">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">{t('assessments.detail.result')}</p>
                <Badge variant={selected.result} />
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400 mb-1">{t('assessments.detail.supervisorSignOff')}</p>
                {selected.signed ? (
                  <span className="text-sm font-medium text-green-600">✓ {t('assessments.detail.signedStatus')}</span>
                ) : (
                  <span className="text-sm font-medium text-amber-600">{t('assessments.detail.pendingStatus')}</span>
                )}
              </div>
            </div>

            <div>
              <p className="text-xs text-slate-400 mb-1">{t('assessments.detail.mentorNote')}</p>
              <div className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700">
                {selected.result === 'pass'
                  ? 'Student demonstrated good understanding of the procedure. All safety protocols followed correctly.'
                  : selected.result === 'needs-improvement'
                  ? 'Student needs more practice with the measurement technique. Recommend additional supervised session before reassessment.'
                  : 'Student was absent during the practical session. Reschedule required.'}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Supervisor sign-off confirmation */}
      <ConfirmDialog
        open={!!signOffTarget}
        title={t('action.supervisorSignOff')}
        message={signOffTarget ? `Sign off ${signOffTarget.id} for ${signOffTarget.student}? Signed results count toward certification and cannot be unsigned here.` : ''}
        confirmLabel={t('assessments.signOffBtn')}
        onConfirm={signOff}
        onCancel={() => setSignOffTarget(null)}
      />
    </div>
  )
}
