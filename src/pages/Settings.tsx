import React, { useState } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { Input, Select } from '../components/ui/Input'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import { useLang } from '../i18n/LanguageContext'

type SettingsTab = 'users' | 'general'

interface SystemUser {
  name: string
  email: string
  role: string
  status: 'active' | 'inactive'
}

const initialUsers: SystemUser[] = [
  { name: 'Ahmed Mohammed', email: 'ahmed@wst.sa', role: 'Workshop Manager', status: 'active' },
  { name: 'Khalid Hassan', email: 'khalid@wst.sa', role: 'Technician', status: 'active' },
  { name: 'Fahad Al-Amer', email: 'fahad@wst.sa', role: 'Technician', status: 'active' },
  { name: 'Noura Al-Saud', email: 'noura@wst.sa', role: 'Service Advisor', status: 'active' },
  { name: 'Waleed Khatib', email: 'waleed@wst.sa', role: 'Mentor', status: 'active' },
  { name: 'Fatima Hassan', email: 'fatima@wst.sa', role: 'Mentor', status: 'active' },
  { name: 'Sami Al-Rashidi', email: 'sami@wst.sa', role: 'Training Supervisor', status: 'active' },
]

const roleOptions = [
  'Workshop Manager',
  'Service Advisor',
  'Technician',
  'Quality Checker',
  'Storekeeper',
  'Procurement',
  'Training Supervisor',
  'Mentor',
  'Student',
  'Finance Viewer',
  'Auditor',
]

export default function Settings() {
  const { t } = useLang()
  const { showToast } = useToast()
  const [tab, setTab] = useState<SettingsTab>('users')
  const [users, setUsers] = useState<SystemUser[]>(initialUsers)

  // Invite / edit user
  const [userModalOpen, setUserModalOpen] = useState(false)
  const [editingEmail, setEditingEmail] = useState<string | null>(null)
  const [formName, setFormName] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formRole, setFormRole] = useState(roleOptions[0])
  const [formError, setFormError] = useState('')

  // Deactivate
  const [deactivateTarget, setDeactivateTarget] = useState<SystemUser | null>(null)

  // General sections (editable workshop configuration)
  const [workshopInfo, setWorkshopInfo] = useState([
    { label: 'Workshop Name', value: 'WST Workshop — Riyadh Main Branch' },
    { label: 'Address', value: 'King Fahd Road, Al Olaya, Riyadh 12211' },
    { label: 'Phone', value: '+966 11 234 5678' },
    { label: 'VAT Number', value: '300123456700003' },
  ])
  const [sysConfig, setSysConfig] = useState([
    { label: 'High-Value PO Threshold (SAR)', value: '5,000' },
    { label: 'Required Approvals for High-Value PO', value: '2' },
    { label: 'Default Invoice Currency', value: 'SAR (Saudi Riyal)' },
    { label: 'Time Zone', value: 'Asia/Riyadh (UTC+3)' },
  ])
  const [editingSection, setEditingSection] = useState<'workshop' | 'sys' | null>(null)
  const [sectionDraft, setSectionDraft] = useState<{ label: string; value: string }[]>([])

  const tabs: { key: SettingsTab; label: string }[] = [
    { key: 'users', label: t('settings.tab.users') },
    { key: 'general', label: t('settings.tab.general') },
  ]

  const openInvite = () => {
    setEditingEmail(null)
    setFormName('')
    setFormEmail('')
    setFormRole(roleOptions[0])
    setFormError('')
    setUserModalOpen(true)
  }

  const openEdit = (u: SystemUser) => {
    setEditingEmail(u.email)
    setFormName(u.name)
    setFormEmail(u.email)
    setFormRole(u.role)
    setFormError('')
    setUserModalOpen(true)
  }

  const saveUser = () => {
    if (!formName.trim()) {
      setFormError('Name is required.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail.trim())) {
      setFormError('Enter a valid email address.')
      return
    }
    if (editingEmail) {
      setUsers((prev) =>
        prev.map((u) =>
          u.email === editingEmail
            ? { ...u, name: formName.trim(), email: formEmail.trim(), role: formRole }
            : u,
        ),
      )
      showToast('success', 'User updated', `${formName.trim()} saved.`)
    } else {
      if (users.some((u) => u.email.toLowerCase() === formEmail.trim().toLowerCase())) {
        setFormError('A user with this email already exists.')
        return
      }
      setUsers((prev) => [
        ...prev,
        { name: formName.trim(), email: formEmail.trim(), role: formRole, status: 'active' },
      ])
      showToast('success', 'User invited', `${formEmail.trim()} added as ${formRole}.`)
    }
    setUserModalOpen(false)
  }

  const confirmDeactivate = () => {
    if (!deactivateTarget) return
    setUsers((prev) =>
      prev.map((u) =>
        u.email === deactivateTarget.email
          ? { ...u, status: u.status === 'active' ? 'inactive' : 'active' }
          : u,
      ),
    )
    showToast(
      'success',
      deactivateTarget.status === 'active' ? 'User deactivated' : 'User reactivated',
      deactivateTarget.email,
    )
    setDeactivateTarget(null)
  }

  const openSectionEdit = (section: 'workshop' | 'sys') => {
    setEditingSection(section)
    setSectionDraft(
      (section === 'workshop' ? workshopInfo : sysConfig).map((f) => ({ ...f })),
    )
  }

  const saveSection = () => {
    if (sectionDraft.some((f) => !f.value.trim())) {
      showToast('error', 'Validation failed', 'All fields must have a value.')
      return
    }
    if (editingSection === 'workshop') setWorkshopInfo(sectionDraft)
    if (editingSection === 'sys') setSysConfig(sectionDraft)
    showToast('success', 'Settings saved', 'Configuration updated.')
    setEditingSection(null)
  }

  const generalSections = [
    { key: 'workshop' as const, titleKey: 'settings.general.workshopInfo' as const, fields: workshopInfo },
    { key: 'sys' as const, titleKey: 'settings.general.sysConfig' as const, fields: sysConfig },
  ]

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
            <Button size="sm" onClick={openInvite}>{t('action.inviteUser')}</Button>
          </div>
          <div className="overflow-x-auto">
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
                      {u.status === 'active' ? (
                        <span className="bg-green-50 text-green-700 text-xs font-medium px-2 py-0.5 rounded-full border border-green-200">{t('settings.users.active')}</span>
                      ) : (
                        <span className="bg-slate-100 text-slate-500 text-xs font-medium px-2 py-0.5 rounded-full border border-slate-200">Inactive</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(u)} className="text-xs text-slate-500 hover:text-blue-600">{t('settings.users.edit')}</button>
                        <span className="text-slate-200">|</span>
                        <button onClick={() => setDeactivateTarget(u)} className="text-xs text-red-500 hover:text-red-700">
                          {u.status === 'active' ? t('settings.users.deactivate') : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'general' && (
        <div className="max-w-2xl space-y-6">
          {generalSections.map((section) => (
            <div key={section.key} className="bg-white border border-slate-200 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900">{t(section.titleKey)}</h3>
                <Button size="sm" variant="secondary" onClick={() => openSectionEdit(section.key)}>{t('action.edit')}</Button>
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

      {/* Invite / Edit user modal */}
      <Modal
        open={userModalOpen}
        onClose={() => setUserModalOpen(false)}
        title={editingEmail ? t('settings.users.edit') : t('action.inviteUser')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setUserModalOpen(false)}>{t('action.cancel')}</Button>
            <Button onClick={saveUser}>{t('action.save')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Input label="Full name" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Sara Al-Otaibi" required error={formError && !formName.trim() ? formError : undefined} />
          <Input label="Email" type="email" value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="user@wst.sa" required disabled={!!editingEmail} />
          <Select label="Role" value={formRole} onChange={(e) => setFormRole(e.target.value)} options={roleOptions.map((r) => ({ value: r, label: r }))} required />
          {formError && formName.trim() && (
            <p className="text-xs text-red-600">{formError}</p>
          )}
        </div>
      </Modal>

      {/* Deactivate / reactivate confirmation */}
      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.status === 'active' ? 'Deactivate user' : 'Reactivate user'}
        message={
          deactivateTarget?.status === 'active'
            ? `${deactivateTarget?.name} (${deactivateTarget?.email}) will lose access immediately. You can reactivate them later.`
            : `${deactivateTarget?.name} (${deactivateTarget?.email}) will regain access.`
        }
        confirmLabel={deactivateTarget?.status === 'active' ? t('settings.users.deactivate') : 'Reactivate'}
        destructive={deactivateTarget?.status === 'active'}
        onConfirm={confirmDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />

      {/* Edit general section modal */}
      <Modal
        open={editingSection !== null}
        onClose={() => setEditingSection(null)}
        title={t('action.edit')}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditingSection(null)}>{t('action.cancel')}</Button>
            <Button onClick={saveSection}>{t('action.save')}</Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          {sectionDraft.map((field, i) => (
            <Input
              key={field.label}
              label={field.label}
              value={field.value}
              onChange={(e) =>
                setSectionDraft((prev) => prev.map((f, j) => (j === i ? { ...f, value: e.target.value } : f)))
              }
              required
            />
          ))}
        </div>
      </Modal>
    </div>
  )
}
