import React, { useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { DemoBadge } from '../components/common/DemoBadge'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'

type CertStatus = 'not-eligible' | 'pending' | 'eligible' | 'issued' | 'revoked'

interface Competency {
  name: string
  status: 'pass' | 'fail' | 'needs-improvement' | 'pending'
  signed: boolean
}

interface StudentRecord {
  id: string
  name: string
  course: string
  certStatus: CertStatus
  certNumber: string | null
  certDate: string | null
  completionPct: number
  competencies: Competency[]
}

const seedStudents: StudentRecord[] = [
  {
    id: 'STU-001',
    name: 'Abdullah Al-Faraj',
    course: 'Engine Overhaul Basics',
    certStatus: 'issued' as CertStatus,
    certNumber: 'CERT-2024-0091',
    certDate: '2024-08-30',
    completionPct: 100,
    competencies: [
      { name: 'Oil Change Procedure', status: 'pass' as const, signed: true },
      { name: 'Air Filter Inspection', status: 'pass' as const, signed: true },
      { name: 'Coolant Check & Top-up', status: 'pass' as const, signed: true },
      { name: 'Spark Plug Replacement', status: 'pass' as const, signed: true },
    ],
  },
  {
    id: 'STU-002',
    name: 'Lama Al-Saqr',
    course: 'Brake System Inspection',
    certStatus: 'pending' as CertStatus,
    certNumber: null,
    certDate: null,
    completionPct: 75,
    competencies: [
      { name: 'Brake Pad Measurement', status: 'needs-improvement' as const, signed: false },
      { name: 'Rotor Inspection', status: 'pass' as const, signed: true },
      { name: 'Caliper Check', status: 'pass' as const, signed: true },
      { name: 'Brake Fluid Test', status: 'pending' as const, signed: false },
    ],
  },
  {
    id: 'STU-003',
    name: 'Turki Al-Dosari',
    course: 'Engine Overhaul Basics',
    certStatus: 'eligible' as CertStatus,
    certNumber: null,
    certDate: null,
    completionPct: 100,
    competencies: [
      { name: 'Oil Change Procedure', status: 'pass' as const, signed: true },
      { name: 'Air Filter Inspection', status: 'pass' as const, signed: true },
      { name: 'Coolant Check & Top-up', status: 'pass' as const, signed: true },
      { name: 'Spark Plug Replacement', status: 'pass' as const, signed: true },
    ],
  },
  {
    id: 'STU-004',
    name: 'Maha Al-Otaibi',
    course: 'Electrical Diagnostics & ECU',
    certStatus: 'not-eligible' as CertStatus,
    certNumber: null,
    certDate: null,
    completionPct: 40,
    competencies: [
      { name: 'OBD-II Fault Reading', status: 'pass' as const, signed: false },
      { name: 'Multimeter Usage', status: 'pass' as const, signed: false },
      { name: 'ECU Reset Procedure', status: 'pending' as const, signed: false },
      { name: 'Wiring Harness Inspection', status: 'pending' as const, signed: false },
      { name: 'Sensor Testing', status: 'pending' as const, signed: false },
    ],
  },
]

export default function Competencies() {
  const { t } = useLang()
  const { showToast } = useToast()
  const [students, setStudents] = useState<StudentRecord[]>(seedStudents)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [issueTarget, setIssueTarget] = useState<StudentRecord | null>(null)

  const selected = students.find((s) => s.id === selectedId) ?? null

  const certBadge: Record<CertStatus, { label: string; cls: string }> = {
    'not-eligible': { label: t('competencies.cert.notEligible'), cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
    pending: { label: t('competencies.cert.pending'), cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    eligible: { label: t('competencies.cert.eligible'), cls: 'bg-green-50 text-green-700 border border-green-200' },
    issued: { label: t('competencies.cert.issued'), cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    revoked: { label: t('competencies.cert.revoked'), cls: 'bg-red-50 text-red-700 border border-red-200' },
  }

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.course.toLowerCase().includes(search.toLowerCase())
  )

  /** Certificates require 100% completion with every result signed. */
  const eligibilityProblem = (s: StudentRecord): string | null => {
    if (s.completionPct < 100) return `Completion is ${s.completionPct}% — all required competencies must be completed.`
    const unsigned = s.competencies.filter((c) => !c.signed)
    if (unsigned.length > 0) return `${unsigned.length} unsigned result(s) remain pending and cannot count toward certification.`
    const notPassed = s.competencies.filter((c) => c.status !== 'pass')
    if (notPassed.length > 0) return `${notPassed.length} competencie(s) are not passed yet.`
    return null
  }

  const confirmIssue = () => {
    if (!issueTarget) return
    const problem = eligibilityProblem(issueTarget)
    if (problem) {
      showToast('error', 'Not eligible for certificate', problem)
      setIssueTarget(null)
      return
    }
    const certNumber = `CERT-2024-${String(Math.floor(1000 + Math.random() * 9000))}`
    const certDate = new Date().toISOString().slice(0, 10)
    setStudents((prev) =>
      prev.map((s) => (s.id === issueTarget.id ? { ...s, certStatus: 'issued' as CertStatus, certNumber, certDate } : s)),
    )
    showToast('success', 'Certificate issued', `${certNumber} for ${issueTarget.name}`)
    setSelectedId(issueTarget.id)
    setIssueTarget(null)
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('competencies.title')}
        subtitle={t('competencies.subtitle')}
        badge={<DemoBadge />}
      />

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: t('competencies.kpi.issued'), value: students.filter((s) => s.certStatus === 'issued').length, color: 'text-blue-600' },
          { label: t('competencies.kpi.eligible'), value: students.filter((s) => s.certStatus === 'eligible').length, color: 'text-green-600' },
          { label: t('competencies.kpi.inProgress'), value: students.filter((s) => s.certStatus === 'pending' || s.certStatus === 'not-eligible').length, color: 'text-amber-600' },
          { label: t('competencies.kpi.total'), value: students.length, color: 'text-slate-700' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-xl p-5">
            <p className="text-sm text-slate-500 font-medium">{kpi.label}</p>
            <p className={`text-3xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <SearchBar value={search} onChange={setSearch} placeholder={t('competencies.search')} />
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('competencies.col.student')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('competencies.col.course')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('competencies.col.progress')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('competencies.col.certStatus')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('competencies.col.certNumber')}</th>
              <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('competencies.col.actions')}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => {
              const cert = certBadge[s.certStatus]
              return (
                <tr
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="border-b border-slate-50 last:border-0 hover:bg-slate-50 cursor-pointer"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-xs font-bold">
                        {s.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{s.name}</p>
                        <p className="text-xs text-slate-400" dir="ltr">{s.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{s.course}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.completionPct === 100 ? 'bg-green-500' : s.completionPct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
                          style={{ width: `${s.completionPct}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-slate-600">{s.completionPct}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cert.cls}`}>
                      {cert.label}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-500" dir="ltr">{s.certNumber ?? '—'}</td>
                  <td className="px-6 py-4">
                    <div onClick={(e) => e.stopPropagation()}>
                      {s.certStatus === 'eligible' && (
                        <Button size="sm" onClick={() => setIssueTarget(s)}>{t('competencies.action.issue')}</Button>
                      )}
                      {s.certStatus === 'issued' && (
                        <Button size="sm" variant="secondary" onClick={() => setSelectedId(s.id)}>{t('competencies.action.view')}</Button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Competency Detail Modal */}
      {selected && (
        <Modal
          open={!!selected}
          onClose={() => setSelectedId(null)}
          title={`${selected.name} — Competency Record`}
          size="lg"
          footer={
            <>
              <Button variant="secondary" onClick={() => setSelectedId(null)}>{t('action.close')}</Button>
              {selected.certStatus === 'eligible' && <Button onClick={() => setIssueTarget(selected)}>{t('competencies.action.issue')}</Button>}
            </>
          }
        >
          <div className="flex flex-col gap-5">
            {/* Header info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{t('competencies.detail.course')}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{selected.course}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{t('competencies.detail.completion')}</p>
                <p className="mt-0.5 text-sm font-bold text-slate-800">{selected.completionPct}%</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{t('competencies.detail.certStatus')}</p>
                <div className="mt-0.5">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${certBadge[selected.certStatus].cls}`}>
                    {certBadge[selected.certStatus].label}
                  </span>
                </div>
              </div>
            </div>

            {selected.certNumber && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm font-semibold text-blue-800">{t('competencies.detail.certInfo')}</p>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <p className="text-xs text-blue-600">{t('competencies.detail.certNumber')}</p>
                    <p className="text-sm font-mono font-bold text-blue-800" dir="ltr">{selected.certNumber}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-600">{t('competencies.detail.issueDate')}</p>
                    <p className="text-sm font-semibold text-blue-800" dir="ltr">{selected.certDate}</p>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">{t('competencies.detail.verifyAt')} <span dir="ltr">wst.sa/verify/{selected.certNumber}</span></p>
              </div>
            )}

            {/* Competency list */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">
                {t('competencies.detail.competenciesHeading')} ({selected.competencies.filter((c) => c.status === 'pass').length}/{selected.competencies.length} {t('competencies.detail.completed')})
              </h3>
              <div className="flex flex-col gap-2">
                {selected.competencies.map((comp, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border border-slate-100 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                        (comp.status as string) === 'pass' ? 'bg-green-100' :
                        (comp.status as string) === 'fail' ? 'bg-red-100' :
                        (comp.status as string) === 'needs-improvement' ? 'bg-amber-100' : 'bg-slate-100'
                      }`}>
                        {(comp.status as string) === 'pass' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>}
                        {(comp.status as string) === 'fail' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>}
                        {(comp.status as string) === 'needs-improvement' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /></svg>}
                        {(comp.status as string) === 'pending' && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="9" /></svg>}
                      </div>
                      <span className="text-sm text-slate-700">{comp.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={comp.status as Parameters<typeof Badge>[0]['variant']} showDot={false} />
                      {comp.signed ? (
                        <span className="text-xs text-green-600">✓ {t('competencies.detail.signed')}</span>
                      ) : (
                        <span className="text-xs text-amber-600">{t('competencies.detail.unsigned')}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Issue certificate confirmation */}
      <ConfirmDialog
        open={!!issueTarget}
        title={t('competencies.action.issue')}
        message={issueTarget ? `Issue a certificate to ${issueTarget.name} for ${issueTarget.course}? Eligibility is verified before issuance.` : ''}
        confirmLabel={t('competencies.action.issue')}
        onConfirm={confirmIssue}
        onCancel={() => setIssueTarget(null)}
      />
    </div>
  )
}
