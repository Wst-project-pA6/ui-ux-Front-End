import { useCallback, useEffect, useState } from 'react'
import { PageHeader, SearchBar } from '../components/ui/PageHeader'
import { Badge, badgeVariantFor } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select, Textarea } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { trainingV3, type Competency, type PracticalTask } from '../api/v6/training'
import { PERMS, backendErrorMessage } from '../api/v3/types'
import { ApiError } from '../api/errors'
import { LoadingState, EmptyState, ErrorState, FieldErrors } from '../components/common/ApiStates'

type Tab = 'competencies' | 'tasks'

function locName(name: { en?: string; ar?: string } | undefined, lang: string): string {
  if (!name) return '—'
  return (lang === 'ar' ? name.ar || name.en : name.en || name.ar) ?? '—'
}

export default function Competencies() {
  const { t } = useLang()
  const { hasPermission } = useAuth()
  const canManage = hasPermission(PERMS.trainingManage)
  const [tab, setTab] = useState<Tab>('competencies')
  return (
    <div className="space-y-6">
      <PageHeader title={t('comp.title')} subtitle={t('comp.subtitle')} />
      <div className="flex border-b border-slate-200">
        {(
          [
            { key: 'competencies', label: t('comp.tab.competencies') },
            { key: 'tasks', label: t('comp.tab.tasks') },
          ] as { key: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 ${tab === t.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'competencies' && <CompetencyTab canManage={canManage} />}
      {tab === 'tasks' && <TasksTab canManage={canManage} />}
    </div>
  )
}

function CompetencyTab({ canManage }: { canManage: boolean }) {
  const { t, lang } = useLang()
  const { showToast } = useToast()
  const [items, setItems] = useState<Competency[]>([])
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Competency | null>(null)
  const [form, setForm] = useState({ code: '', nameEn: '', nameAr: '', description: '', status: 'ACTIVE' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const res = await trainingV3.competencies({ page: 1, pageSize: 100 })
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

  const openCreate = () => {
    setEditing(null)
    setForm({ code: '', nameEn: '', nameAr: '', description: '', status: 'ACTIVE' })
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (c: Competency) => {
    const r = c as unknown as { name?: { en?: string; ar?: string }; description?: string; status?: string }
    setEditing(c)
    setForm({ code: '', nameEn: r.name?.en ?? '', nameAr: r.name?.ar ?? '', description: r.description ?? '', status: r.status ?? 'ACTIVE' })
    setSaveError(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        await trainingV3.updateCompetency(editing.id, {
          name: { en: form.nameEn.trim(), ...(form.nameAr ? { ar: form.nameAr } : {}) },
          ...(form.description ? { description: form.description } : {}),
          status: form.status as 'ACTIVE' | 'ARCHIVED',
        })
        showToast('success', 'Competency updated', '')
      } else {
        if (!form.code.trim() || !form.nameEn.trim()) {
          setSaveError(new ApiError({ message: 'Code and English name are required.', code: 'BAD_REQUEST', status: 400 }))
          setSaving(false)
          return
        }
        await trainingV3.createCompetency({
          code: form.code.trim(),
          name: { en: form.nameEn.trim(), ...(form.nameAr ? { ar: form.nameAr } : {}) },
          ...(form.description ? { description: form.description } : {}),
        })
        showToast('success', 'Competency created', form.code.trim())
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
        <p className="text-sm font-semibold">{t('comp.tab.competencies')} ({items.length})</p>
        {canManage && <Button size="sm" onClick={openCreate}>{t('comp.new')}</Button>}
      </div>
      {state === 'loading' && <div className="p-4"><LoadingState /></div>}
      {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('comp.noCompetencies')} /></div>}
      {state === 'success' && items.length > 0 && (
        <div className="divide-y divide-slate-50">
          {items.map((c) => {
            const r = c as unknown as { code?: string; name?: { en?: string; ar?: string }; status?: string }
            return (
              <div key={c.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{locName(r.name, lang)} <span className="font-mono text-xs text-slate-400" dir="ltr">{r.code}</span></p>
                </div>
                <Badge variant={badgeVariantFor(r.status ?? '')} />
                {canManage && <Button variant="secondary" size="sm" onClick={() => openEdit(c)}>{t('f.edit')}</Button>}
              </div>
            )
          })}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? t('comp.edit') : t('comp.new')} size="md"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          {!editing && <Input label={t('f.code')} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />}
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('f.nameEn')} value={form.nameEn} onChange={(e) => setForm({ ...form, nameEn: e.target.value })} required />
            <Input label={t('f.nameAr')} value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} />
          </div>
          <Textarea label={t('f.description')} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          {editing && (
            <Select label={t('f.status')} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'ARCHIVED', label: 'Archived' }]} />
          )}
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>
    </div>
  )
}

function TasksTab({ canManage }: { canManage: boolean }) {
  const { t, lang } = useLang()
  const { showToast } = useToast()
  const [items, setItems] = useState<PracticalTask[]>([])
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [error, setError] = useState<unknown>(null)
  const [competencies, setCompetencies] = useState<Competency[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<PracticalTask | null>(null)
  const [form, setForm] = useState({ code: '', titleEn: '', titleAr: '', description: '', competencyId: '', expectedMinutes: '', status: 'ACTIVE' })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<unknown>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQ(q.trim()), 400)
    return () => window.clearTimeout(t)
  }, [q])

  const load = useCallback(async () => {
    setState('loading')
    setError(null)
    try {
      const [tk, cp] = await Promise.all([
        trainingV3.tasks({ page: 1, pageSize: 100, q: debouncedQ || undefined }),
        trainingV3.competencies({ page: 1, pageSize: 100 }).catch(() => ({ items: [] })),
      ])
      setItems(tk.items)
      setCompetencies((cp as { items: Competency[] }).items ?? [])
      setState('success')
    } catch (err) {
      setError(err)
      setState('error')
    }
  }, [debouncedQ])

  useEffect(() => {
    load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    setForm({ code: '', titleEn: '', titleAr: '', description: '', competencyId: '', expectedMinutes: '', status: 'ACTIVE' })
    setSaveError(null)
    setModalOpen(true)
  }

  const openEdit = (task: PracticalTask) => {
    const r = task as unknown as { title?: { en?: string; ar?: string }; description?: string; competencyId?: string; expectedMinutes?: number; status?: string }
    setEditing(task)
    setForm({
      code: '', titleEn: r.title?.en ?? '', titleAr: r.title?.ar ?? '', description: r.description ?? '',
      competencyId: r.competencyId ?? '', expectedMinutes: String(r.expectedMinutes ?? ''), status: r.status ?? 'ACTIVE',
    })
    setSaveError(null)
    setModalOpen(true)
  }

  const save = async () => {
    if (saving) return
    setSaving(true)
    setSaveError(null)
    try {
      if (editing) {
        await trainingV3.updateTask(editing.id, {
          title: { en: form.titleEn.trim(), ...(form.titleAr ? { ar: form.titleAr } : {}) },
          ...(form.description ? { description: form.description } : {}),
          ...(form.competencyId ? { competencyId: form.competencyId } : {}),
          ...(form.expectedMinutes ? { expectedMinutes: Number(form.expectedMinutes) } : {}),
          status: form.status as 'ACTIVE' | 'ARCHIVED',
        })
        showToast('success', 'Task updated', '')
      } else {
        if (!form.code.trim() || !form.titleEn.trim() || !form.competencyId || !form.expectedMinutes) {
          setSaveError(new ApiError({ message: 'Code, English title, competency and expected minutes are required.', code: 'BAD_REQUEST', status: 400 }))
          setSaving(false)
          return
        }
        await trainingV3.createTask({
          code: form.code.trim(),
          title: { en: form.titleEn.trim(), ...(form.titleAr ? { ar: form.titleAr } : {}) },
          ...(form.description ? { description: form.description } : {}),
          competencyId: form.competencyId,
          expectedMinutes: Number(form.expectedMinutes),
        })
        showToast('success', 'Task created', form.code.trim())
      }
      setModalOpen(false)
      load()
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err)
      else showToast('error', 'Failed', backendErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
        <div className="flex-1 min-w-[200px]"><SearchBar value={q} onChange={setQ} placeholder={t('f.search')} /></div>
        {canManage && <Button size="sm" onClick={openCreate}>{t('comp.newTask')}</Button>}
        <span className="text-xs text-slate-400 ms-auto">{items.length} tasks</span>
      </div>
      {state === 'loading' && <div className="p-4"><LoadingState /></div>}
      {state === 'error' && <div className="p-4"><ErrorState error={error} onRetry={load} /></div>}
      {state === 'success' && items.length === 0 && <div className="p-4"><EmptyState title={t('comp.noTasks')} /></div>}
      {state === 'success' && items.length > 0 && (
        <div className="divide-y divide-slate-50">
          {items.map((task) => {
            const r = task as unknown as { code?: string; title?: { en?: string; ar?: string }; expectedMinutes?: number; status?: string }
            return (
              <div key={task.id} className="px-4 py-3 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-medium text-sm">{locName(r.title, lang)} <span className="font-mono text-xs text-slate-400" dir="ltr">{r.code}</span></p>
                  <p className="text-xs text-slate-400">~{r.expectedMinutes} min</p>
                </div>
                <Badge variant={badgeVariantFor(r.status ?? '')} />
                {canManage && <Button variant="secondary" size="sm" onClick={() => openEdit(task)}>{t('f.edit')}</Button>}
              </div>
            )
          })}
        </div>
      )}
      <Modal open={modalOpen} onClose={() => !saving && setModalOpen(false)} title={editing ? t('comp.editTask') : t('comp.newTask')} size="md"
        footer={<><Button variant="secondary" disabled={saving} onClick={() => setModalOpen(false)}>Cancel</Button><Button disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save'}</Button></>}>
        <div className="flex flex-col gap-3">
          {!editing && <Input label="Code (unique)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />}
          <div className="grid grid-cols-2 gap-3">
            <Input label={t('f.nameEn')} value={form.titleEn} onChange={(e) => setForm({ ...form, titleEn: e.target.value })} required />
            <Input label={t('f.nameAr')} value={form.titleAr} onChange={(e) => setForm({ ...form, titleAr: e.target.value })} />
          </div>
          <Textarea label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          <div className="grid grid-cols-2 gap-3">
            <Select label={t('comp.tab.competencies')} value={form.competencyId} onChange={(e) => setForm({ ...form, competencyId: e.target.value })}
              options={[{ value: '', label: 'Select' }, ...competencies.map((c) => ({ value: c.id, label: (c as unknown as { code?: string }).code ?? c.id }))]} required={!editing} />
            <Input label={t('comp.expectedMinutes')} type="number" value={form.expectedMinutes} onChange={(e) => setForm({ ...form, expectedMinutes: e.target.value })} required={!editing} />
          </div>
          {editing && (
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'ARCHIVED', label: 'Archived' }]} />
          )}
          {saveError ? <FieldErrors error={saveError} /> : null}
        </div>
      </Modal>
    </div>
  )
}
