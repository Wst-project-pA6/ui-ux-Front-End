import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { useLang } from '../i18n/LanguageContext'
import { predictionsApi } from '../api/resources'
import { ApiError } from '../api/http'
import { errorMessage } from '../api/mapping'
import { isUuid } from '../api/identity'

type ConfidenceLevel = 'high' | 'medium' | 'low'
type InsightCategory = 'parts-demand' | 'training-risk'

interface Insight {
  id: string
  category: InsightCategory
  title: string
  prediction: string
  reason: string
  baseline: string
  confidence: ConfidenceLevel
  dataAvailability: string
  recommendation: string
  overridden: boolean
  decidedStatus?: string
}

const DEMO_INSIGHTS: Insight[] = [
  {
    id: 'INS-001',
    category: 'parts-demand',
    title: 'Low Stock Risk — Brake Pad Set',
    prediction: 'Stock will reach zero within 3–5 days if no reorder is placed.',
    reason: 'Weekly consumption rate (avg 4.2 units/week) exceeds current on-hand stock (3 units) at current trend.',
    baseline: 'Avg weekly usage: 4.2 units | Current stock: 3 units | Min threshold: 10 units',
    confidence: 'high',
    dataAvailability: 'Based on 24 weeks of consumption data (confidence: high)',
    recommendation: 'Review reorder quantity. Suggested reorder: 25 units from Al-Mujab Auto Parts (4.2 day lead time).',
    overridden: false,
  },
  {
    id: 'INS-002',
    category: 'parts-demand',
    title: 'Increased Demand Forecast — Engine Oil 5W-30',
    prediction: 'Demand expected to increase by 18% in the next 30 days based on seasonal patterns.',
    reason: 'Historical data shows 15–22% higher oil consumption during Q4 due to increased workshop traffic.',
    baseline: 'Avg Q3 weekly usage: 8 units | Projected Q4 weekly usage: 9.5 units',
    confidence: 'medium',
    dataAvailability: 'Based on 3 years of seasonal data (confidence: medium — some variance between years)',
    recommendation: 'Consider increasing max stock level from 60 to 80 units before peak period begins.',
    overridden: false,
  },
  {
    id: 'INS-003',
    category: 'training-risk',
    title: 'Completion Risk — Lama Al-Saqr',
    prediction: 'Student at risk of failing to complete Brake System Inspection course before deadline.',
    reason: 'Current attendance rate (87%) and one incomplete assessment with "Needs Improvement" result creates a 62% probability of non-completion without intervention.',
    baseline: 'Sessions attended: 4/5 | Assessments passed: 2/4 | Course deadline: Oct 31, 2024',
    confidence: 'medium',
    dataAvailability: 'Based on assessment and attendance data for current enrollment (confidence: medium)',
    recommendation: 'Schedule additional supervised practice session for Brake Pad Measurement task. Mentor review recommended.',
    overridden: false,
  },
  {
    id: 'INS-004',
    category: 'training-risk',
    title: 'High Completion Likelihood — Maha Al-Otaibi',
    prediction: 'Student on track to complete Electrical Diagnostics course and qualify for certification by Nov 15, 2024.',
    reason: 'Attendance rate of 96% and consistently passing early assessments (2/2) indicate high engagement.',
    baseline: 'Sessions attended: 3/5 | Assessments passed: 2/5 | Attendance: 96%',
    confidence: 'high',
    dataAvailability: 'Based on current enrollment performance data (confidence: high)',
    recommendation: 'No action required. Monitor continued progress.',
    overridden: false,
  },
]

export default function AIInsights() {
  const { t } = useLang()
  const [insights, setInsights] = useState<Insight[]>(DEMO_INSIGHTS)
  const [overrides, setOverrides] = useState<Record<string, boolean>>({})
  const [activeCategory, setActiveCategory] = useState<InsightCategory | 'all'>('all')
  const [decidingId, setDecidingId] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [actionError, setActionError] = useState('')

  // Live predictions (always advisory — every decision needs a human).
  // Offline: the preview insights stay in place.
  const load = React.useCallback(async () => {
    try {
      const res = await predictionsApi.list({ pageSize: 100, sort: '-generatedAt' })
      setInsights(res.items.map((p) => {
        const reorder = p.type === 'REORDER_SUGGESTION'
        const factors = p.explanation.factors.map((f) => f.message).join(' ')
        return {
          id: p.id,
          category: (reorder ? 'parts-demand' : 'training-risk') as InsightCategory,
          title: reorder
            ? `Reorder suggestion — ${p.reorder?.input.partSku ?? p.id.slice(0, 8)}`
            : `Training risk — ${p.trainingRisk?.result.riskLevel ?? ''} ${p.trainingRisk ? p.trainingRisk.input.studentId.slice(0, 8) : ''}`.trim(),
          prediction: p.explanation.summary,
          reason: factors || p.explanation.summary,
          baseline: reorder && p.reorder
            ? `On hand ${p.reorder.input.onHand} · reserved ${p.reorder.input.reserved} · available ${p.reorder.input.available} · min ${p.reorder.input.minLevel} · max ${p.reorder.input.maxLevel} · suggested ${p.reorder.result.suggestedQuantity}`
            : p.trainingRisk
              ? `Attendance ${p.trainingRisk.input.attendancePercent}% · missing sessions ${p.trainingRisk.input.missingAttendanceSessions} · unsigned assessments ${p.trainingRisk.input.unsignedAssessmentCount} · unmet competencies ${p.trainingRisk.input.unmetCompetencyCount}`
              : '—',
          confidence: (p.source.kind === 'ML_MODEL' ? 'high' : 'medium') as ConfidenceLevel,
          dataAvailability: `Source: ${p.source.name} v${p.source.version} · generated ${new Date(p.generatedAt).toLocaleDateString()}`,
          recommendation: reorder && p.reorder
            ? `Suggested reorder quantity: ${p.reorder.result.suggestedQuantity}`
            : p.trainingRisk ? p.trainingRisk.result.flags.join('; ') || 'Monitor progress.' : '',
          overridden: p.status === 'OVERRIDDEN' || p.status === 'DISMISSED',
          decidedStatus: p.status === 'ACTIVE' ? undefined : p.status,
        }
      }))
    } catch {
      // Offline / unauthorized: keep the preview insights.
    }
  }, [])

  React.useEffect(() => { void load() }, [load])

  // Human decision: ACCEPTED | OVERRIDDEN | DISMISSED. Overrides record a
  // reason (min 3 chars). Decisions are final server-side.
  const decide = async (insight: Insight, decision: 'ACCEPTED' | 'OVERRIDDEN' | 'DISMISSED') => {
    if (!isUuid(insight.id)) {
      setOverrides((prev) => ({ ...prev, [insight.id]: !prev[insight.id] }))
      return
    }
    let overrideReason: string | undefined
    if (decision === 'OVERRIDDEN') {
      overrideReason = window.prompt('Override reason (min 3 characters, recorded in audit):')?.trim() ?? ''
      if (overrideReason.length < 3) {
        setActionError('An override reason of at least 3 characters is required.')
        return
      }
    }
    setDecidingId(insight.id)
    setActionError('')
    try {
      const updated = await predictionsApi.decide(insight.id, { decision, overrideReason })
      setInsights((prev) => prev.map((x) => (x.id === insight.id
        ? { ...x, overridden: true, decidedStatus: updated.status }
        : x)))
    } catch (err) {
      setActionError(err instanceof ApiError ? errorMessage(err.code, err.message) : 'Decision failed')
    } finally {
      setDecidingId(null)
    }
  }

  // Generate a fresh prediction run for both types (unscoped), then reload.
  const runAll = async () => {
    setRunning(true)
    setActionError('')
    try {
      for (const type of ['REORDER_SUGGESTION', 'TRAINING_RISK'] as const) {
        await predictionsApi.run({ type })
      }
      await load()
    } catch (err) {
      setActionError(err instanceof ApiError ? errorMessage(err.code, err.message) : 'Prediction run failed')
    } finally {
      setRunning(false)
    }
  }

  const confidenceStyle: Record<ConfidenceLevel, { label: string; cls: string }> = {
    high: { label: t('ai.confidence.high'), cls: 'bg-green-50 text-green-700 border border-green-200' },
    medium: { label: t('ai.confidence.medium'), cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    low: { label: t('ai.confidence.low'), cls: 'bg-red-50 text-red-700 border border-red-200' },
  }

  const categoryLabel: Record<InsightCategory, string> = {
    'parts-demand': t('ai.category.partsDemand'),
    'training-risk': t('ai.category.trainingRisk'),
  }

  const categoryStyle: Record<InsightCategory, string> = {
    'parts-demand': 'bg-blue-50 text-blue-700',
    'training-risk': 'bg-purple-50 text-purple-700',
  }

  const filtered = insights.filter(
    (i) => activeCategory === 'all' || i.category === activeCategory
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('ai.title')}
        subtitle={t('ai.subtitle')}
        actions={
          <Button variant="secondary" size="sm" loading={running} onClick={runAll}>
            Generate new predictions
          </Button>
        }
      />
      {actionError && (
        <div role="alert" className="px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{actionError}</div>
      )}

      {/* Disclaimer Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 flex items-start gap-4">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.75"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" /></svg>
        </div>
        <div>
          <p className="font-semibold">{t('ai.disclaimer.title')}</p>
          <p className="text-slate-300 text-sm mt-1">{t('ai.disclaimer.body')}</p>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2">
        {(['all', 'parts-demand', 'training-risk'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeCategory === cat ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {cat === 'all' ? t('ai.filter.all') : categoryLabel[cat]}
          </button>
        ))}
      </div>

      {/* Insights */}
      <div className="flex flex-col gap-4">
        {filtered.map((insight) => {
          const isOverridden = insight.decidedStatus ? true : !!overrides[insight.id]
          const isLive = isUuid(insight.id)
          return (
            <div
              key={insight.id}
              className={`bg-white border rounded-xl p-6 transition-all ${isOverridden ? 'opacity-60 border-slate-100' : 'border-slate-200'}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${categoryStyle[insight.category]}`}>
                      {categoryLabel[insight.category]}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${confidenceStyle[insight.confidence].cls}`}>
                      {confidenceStyle[insight.confidence].label}
                    </span>
                    {isOverridden && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        {insight.decidedStatus ?? t('ai.overrideApplied')}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mt-2">{insight.title}</h3>
                </div>
                <div className="flex gap-2 shrink-0">
                  {!insight.decidedStatus && (
                    isLive ? (
                      <>
                        <button
                          onClick={() => decide(insight, 'ACCEPTED')}
                          disabled={decidingId === insight.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-50"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => decide(insight, 'OVERRIDDEN')}
                          disabled={decidingId === insight.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
                        >
                          {t('action.applyOverride')}
                        </button>
                        <button
                          onClick={() => decide(insight, 'DISMISSED')}
                          disabled={decidingId === insight.id}
                          className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50"
                        >
                          Dismiss
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => decide(insight, 'OVERRIDDEN')}
                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                          isOverridden
                            ? 'border-slate-200 text-slate-500 hover:bg-slate-50'
                            : 'border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100'
                        }`}
                      >
                        {isOverridden ? t('action.removeOverride') : t('action.applyOverride')}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('ai.section.prediction')}</p>
                    <p className="text-sm text-slate-700">{insight.prediction}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('ai.section.reason')}</p>
                    <p className="text-sm text-slate-700">{insight.reason}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('ai.section.baseline')}</p>
                    <p className="text-sm text-slate-600 font-mono bg-slate-50 px-3 py-2 rounded-lg text-xs">{insight.baseline}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">{t('ai.section.dataAvailability')}</p>
                    <p className="text-xs text-slate-500">{insight.dataAvailability}</p>
                  </div>
                </div>
              </div>

              <div className={`mt-4 pt-4 border-t border-slate-100 rounded-lg flex items-start gap-3 px-4 py-3 ${
                insight.confidence === 'high' ? 'bg-blue-50' : 'bg-amber-50'
              }`}>
                <svg width="14" height="14" className={`shrink-0 mt-0.5 ${insight.confidence === 'high' ? 'text-blue-600' : 'text-amber-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                <div>
                  <p className={`text-xs font-semibold ${insight.confidence === 'high' ? 'text-blue-700' : 'text-amber-700'}`}>{t('ai.section.recommendation')}</p>
                  <p className={`text-sm mt-0.5 ${insight.confidence === 'high' ? 'text-blue-700' : 'text-amber-700'}`}>{insight.recommendation}</p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
