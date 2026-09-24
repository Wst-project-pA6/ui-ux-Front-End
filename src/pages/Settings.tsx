import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { useRole } from '../context/RoleContext'
import { ChangePasswordForm } from '../components/auth/ChangePasswordForm'

type SettingsTab = 'general' | 'security'

interface ConfigSection {
  key: string
  titleKey: 'settings.general.workshopInfo' | 'settings.general.sysConfig'
  fields: { label: string; value: string }[]
}

const initialSections: ConfigSection[] = [
  {
    key: 'workshop',
    titleKey: 'settings.general.workshopInfo',
    fields: [
      { label: 'Workshop Name', value: 'WST Workshop — Riyadh Main Branch' },
      { label: 'Address', value: 'King Fahd Road, Al Olaya, Riyadh 12211' },
      { label: 'Phone', value: '+966 11 234 5678' },
      { label: 'VAT Number', value: '300123456700003' },
    ],
  },
  {
    key: 'sys',
    titleKey: 'settings.general.sysConfig',
    fields: [
      { label: 'High-Value PO Threshold (SAR)', value: '5,000' },
      { label: 'Required Approvals for High-Value PO', value: '2' },
      { label: 'Default Invoice Currency', value: 'SAR (Saudi Riyal)' },
      { label: 'Time Zone', value: 'Asia/Riyadh (UTC+3)' },
    ],
  },
]

/**
 * Settings: workshop configuration (local display) + voluntary password
 * change. User administration lives on the /users page (System Admin).
 * Every user's own role is shown read-only — roles are assigned by the
 * System Admin, never here.
 */
export default function Settings() {
  const { t } = useLang()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { config } = useRole()
  const [tab, setTab] = useState<SettingsTab>('general')
  const [sections, setSections] = useState<ConfigSection[]>(initialSections)
  const [editing, setEditing] = useState<ConfigSection | null>(null)
  const [draft, setDraft] = useState<{ label: string; value: string }[]>([])

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'general', label: t('settings.tab.general') },
    { key: 'security', label: t('settings.tab.security') },
  ]

  const openEdit = (section: ConfigSection) => {
    setEditing(section)
    setDraft(section.fields.map((f) => ({ ...f })))
  }

  const saveEdit = () => {
    if (!editing) return
    if (draft.some((f) => !f.value.trim())) return
    setSections((prev) => prev.map((s) => (s.key === editing.key ? { ...s, fields: draft } : s)))
    setEditing(null)
  }

  const handlePasswordChanged = async () => {
    // 204 ends all sessions: back to Login with an explanatory message.
    await signOut('auth.passwordChangedLogin')
    navigate('/', { replace: true })
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="flex border-b border-slate-200">
        {tabs.map((tabItem) => (
          <button
            key={tabItem.key}
            onClick={() => setTab(tabItem.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === tabItem.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </div>

      {tab === 'general' && (
        <div className="max-w-2xl space-y-6">
          {/* Own role — read-only. Assigned by the System Admin on /users. */}
          <div className="bg-white border border-slate-200 rounded-xl p-6">
            <h3 className="text-base font-semibold text-slate-900">{t('settings.account.title')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{t('settings.account.name')}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">{user?.displayName ?? config.userName}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{t('settings.account.email')}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800" dir="ltr">{user?.email ?? '—'}</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{t('settings.account.role')}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                  {config.userLabel}
                  <span className="ms-2 text-xs font-normal text-slate-400">({t('settings.account.readOnly')})</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-400">{t('settings.account.language')}</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800" dir="ltr">{user?.preferredLocale ?? '—'}</p>
              </div>
            </div>
          </div>

          {sections.map((section) => (
            <div key={section.key} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">{t(section.titleKey)}</h3>
                <Button size="sm" variant="secondary" onClick={() => openEdit(section)}>{t('action.edit')}</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {section.fields.map((field) => (
                  <div key={field.label} className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">{field.label}</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-800" dir="ltr">{field.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'security' && (
        <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900">{t('settings.security.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5 mb-4">{t('settings.security.desc')}</p>
          {user?.mustChangePassword && (
            <div role="alert" className="mb-4 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {t('settings.security.mustChange')}
            </div>
          )}
          <ChangePasswordForm onSuccess={handlePasswordChanged} />
        </div>
      )}

      {/* Edit config section */}
      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? t(editing.titleKey) : ''}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>{t('action.cancel')}</Button>
            <Button onClick={saveEdit} disabled={draft.some((f) => !f.value.trim())}>{t('action.save')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {draft.map((field, i) => (
            <Input
              key={field.label}
              label={field.label}
              value={field.value}
              onChange={(e) => setDraft((prev) => prev.map((f, j) => (j === i ? { ...f, value: e.target.value } : f)))}
              required
            />
          ))}
        </div>
      </Modal>
    </div>
  )
}
