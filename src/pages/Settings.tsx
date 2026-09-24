import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { useLang } from '../i18n/LanguageContext'
import { useAuth } from '../context/AuthContext'
import { changePassword } from '../api/auth'
import { ApiError } from '../api/http'
import { isStrongEnough } from '../utils/demoAuth'

type SettingsTab = 'general' | 'users' | 'security'

const users = [
  { name: 'Ahmed Mohammed', email: 'ahmed@wst.sa', role: 'Workshop Manager', status: 'active' },
  { name: 'Khalid Hassan', email: 'khalid@wst.sa', role: 'Technician', status: 'active' },
  { name: 'Fahad Al-Amer', email: 'fahad@wst.sa', role: 'Technician', status: 'active' },
  { name: 'Noura Al-Saud', email: 'noura@wst.sa', role: 'Service Advisor', status: 'active' },
  { name: 'Waleed Khatib', email: 'waleed@wst.sa', role: 'Mentor', status: 'active' },
  { name: 'Fatima Hassan', email: 'fatima@wst.sa', role: 'Mentor', status: 'active' },
  { name: 'Sami Al-Rashidi', email: 'sami@wst.sa', role: 'Training Supervisor', status: 'active' },
]

export default function Settings() {
  const { t } = useLang()
  const { user } = useAuth()
  const [tab, setTab] = useState<SettingsTab>('users')
  const [pwCurrent, setPwCurrent] = useState('')
  const [pwNew, setPwNew] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState('')
  const [pwDone, setPwDone] = useState(false)

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'users', label: t('settings.tab.users') },
    { key: 'general', label: t('settings.tab.general') },
    { key: 'security', label: t('settings.tab.security') },
  ]

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwError('')
    setPwDone(false)
    if (pwNew !== pwConfirm) {
      setPwError(t('auth.error.passwordMismatch'))
      return
    }
    if (!isStrongEnough(pwNew)) {
      setPwError(t('auth.error.weakPassword'))
      return
    }
    setPwLoading(true)
    try {
      // Contract: POST /auth/change-password clears mustChangePassword and
      // revokes other refresh tokens.
      await changePassword(pwCurrent, pwNew)
      setPwCurrent('')
      setPwNew('')
      setPwConfirm('')
      setPwDone(true)
    } catch (err) {
      setPwError(err instanceof ApiError ? `${err.code}: ${err.message}` : 'Password change failed')
    } finally {
      setPwLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t('settings.title')} subtitle={t('settings.subtitle')} />

      <div className="flex border-b border-slate-200">
        {tabs.map((tab_item) => (
          <button
            key={tab_item.key}
            onClick={() => setTab(tab_item.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === tab_item.key ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab_item.label}
          </button>
        ))}
      </div>

      {tab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-900">{t('settings.users.title')}</h3>
            <Button size="sm">{t('action.inviteUser')}</Button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-50">
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.user')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.email')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.role')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.status')}</th>
                <th className="px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wide">{t('settings.users.col.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.email} className="border-b border-slate-50 last:border-0 hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {u.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                      </div>
                      <span className="font-medium text-slate-800">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-500" dir="ltr">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className="bg-slate-100 text-slate-700 text-xs font-medium px-2 py-1 rounded-md">{u.role}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full border border-green-200">{t('settings.users.active')}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button className="text-xs text-slate-500 hover:text-blue-600">{t('settings.users.edit')}</button>
                      <span className="text-slate-200">|</span>
                      <button className="text-xs text-red-500 hover:text-red-700">{t('settings.users.deactivate')}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'security' && (
        <div className="max-w-xl bg-white border border-slate-200 rounded-xl p-6">
          <h3 className="text-base font-semibold text-slate-900">{t('settings.security.title')}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{t('settings.security.desc')}</p>
          {user?.mustChangePassword && (
            <div role="alert" className="mt-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              {t('settings.security.mustChange')}
            </div>
          )}
          {pwError && (
            <div role="alert" className="mt-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">{pwError}</div>
          )}
          {pwDone && (
            <div role="status" className="mt-3 px-4 py-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">{t('settings.security.changed')}</div>
          )}
          <form onSubmit={handleChangePassword} className="mt-4 flex flex-col gap-4">
            <Input label={t('settings.security.current')} type="password" value={pwCurrent} onChange={(e) => setPwCurrent(e.target.value)} autoComplete="current-password" required />
            <Input label={t('settings.security.new')} type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} autoComplete="new-password" required />
            <Input label={t('settings.security.confirm')} type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} autoComplete="new-password" required />
            <div>
              <Button type="submit" loading={pwLoading}>{t('settings.security.submit')}</Button>
            </div>
          </form>
        </div>
      )}

      {tab === 'general' && (
        <div className="max-w-2xl space-y-6">
          {[
            {
              titleKey: 'settings.general.workshopInfo' as const,
              fields: [
                { label: 'Workshop Name', value: 'WST Workshop — Riyadh Main Branch' },
                { label: 'Address', value: 'King Fahd Road, Al Olaya, Riyadh 12211' },
                { label: 'Phone', value: '+966 11 234 5678' },
                { label: 'VAT Number', value: '300123456700003' },
              ],
            },
            {
              titleKey: 'settings.general.sysConfig' as const,
              fields: [
                { label: 'High-Value PO Threshold (SAR)', value: '5,000' },
                { label: 'Required Approvals for High-Value PO', value: '2' },
                { label: 'Default Invoice Currency', value: 'SAR (Saudi Riyal)' },
                { label: 'Time Zone', value: 'Asia/Riyadh (UTC+3)' },
              ],
            },
          ].map((section) => (
            <div key={section.titleKey} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">{t(section.titleKey)}</h3>
                <Button size="sm" variant="secondary">{t('action.edit')}</Button>
              </div>
              <div className="grid grid-cols-2 gap-4">
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
    </div>
  )
}
