import React, { useState, useEffect } from 'react'
import { Outlet, useLocation, NavLink, useNavigate } from 'react-router-dom'
import { useLang } from '../../i18n/LanguageContext'
import { useRole } from '../../context/RoleContext'
import { useAuth } from '../../context/AuthContext'
import type { TranslationKey } from '../../i18n/translations'
import { Sidebar } from './Sidebar'
import { NAV_ITEMS, filterNavItems, type NavItem } from '../../config/nav'

// All page-title keys — every route now resolved through t()
const pageTitleKeys: Record<string, TranslationKey> = {
  '/dashboard': 'nav.dashboard',
  '/customers': 'nav.customers',
  '/vehicles': 'nav.vehicles',
  '/job-cards': 'nav.jobCards',
  '/inventory': 'nav.inventory',
  '/purchasing': 'nav.purchasing',
  '/training': 'nav.training',
  '/assessments': 'nav.assessments',
  '/competencies': 'nav.competencies',
  '/reports': 'nav.reports',
  '/ai-insights': 'nav.aiInsights',
  '/settings': 'nav.settings',
  '/my-jobs': 'nav.myJobs',
  '/my-training': 'nav.myTraining',
  '/invoices': 'nav.invoices',
  '/role-matrix': 'nav.roleMatrix',
}

// NavList is defined at module scope so it is never recreated on AppShell re-renders.
interface NavListProps {
  items: NavItem[]
  onClose?: () => void
}

function NavList({ items, onClose }: NavListProps) {
  const { t } = useLang()
  return (
    <>
      {items.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-150 ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`
          }
        >
          <span className="shrink-0">{item.icon}</span>
          <span className="text-sm font-medium">{t(item.key)}</span>
        </NavLink>
      ))}
    </>
  )
}

export function AppShell() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { t, lang, setLang } = useLang()
  const { role, config } = useRole()
  const { signOut } = useAuth()

  const handleLogout = async () => {
    // Contract: POST /auth/logout revokes the refresh-token family (best-effort).
    try { await signOut() } finally { navigate('/') }
  }

  // Identical filter used by desktop Sidebar (via filterNavItems) and mobile drawer
  const filteredNavItems = filterNavItems(NAV_ITEMS, role, config.allowedPaths)

  useEffect(() => {
    setDrawerOpen(false)
    setNotifOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [drawerOpen])

  const resolvePageTitle = (pathname: string): string => {
    const key = pageTitleKeys[pathname]
    if (key) return t(key)
    const baseKey = pageTitleKeys['/' + pathname.split('/').filter(Boolean)[0]]
    if (baseKey) return t(baseKey)
    return 'WST'
  }
  const pageTitle = resolvePageTitle(location.pathname)

  const now = new Date()
  const dateStr = now.toLocaleDateString(
    lang === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US',
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' },
  )

  const notifications = [
    { msg: t('topbar.notif1'), time: t('topbar.2mAgo'), type: 'warning' as const },
    { msg: t('topbar.notif2'), time: t('topbar.15mAgo'), type: 'info' as const },
    { msg: t('topbar.notif3'), time: t('topbar.1hAgo'), type: 'error' as const },
    { msg: t('topbar.notif4'), time: t('topbar.2hAgo'), type: 'warning' as const },
  ]

  const notifTypeColor = (type: 'warning' | 'info' | 'error') =>
    type === 'warning' ? 'bg-amber-400' : type === 'error' ? 'bg-red-400' : 'bg-blue-400'

  return (
    <div className="flex h-dvh overflow-hidden bg-slate-50">
      {/* Desktop sidebar — hidden on mobile */}
      <div className="hidden md:flex h-full shrink-0">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden backdrop-blur-[2px]"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Mobile nav drawer */}
      <aside
        className={`fixed inset-y-0 z-50 w-72 bg-slate-900 flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
          lang === 'ar' ? 'right-0' : 'left-0'
        } ${
          drawerOpen
            ? 'translate-x-0'
            : lang === 'ar' ? 'translate-x-full' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">W</span>
            </div>
            <div>
              <span className="text-white font-bold text-sm">WST</span>
              <p className="text-slate-400 text-xs leading-none mt-0.5">{t('sidebar.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            aria-label={t('appshell.closeNav')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Role badge */}
        <div className="px-4 py-2 border-b border-slate-800">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 rounded-lg">
            <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {config.initials}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{config.userName}</p>
              <p className="text-blue-300 text-xs truncate">{config.userLabel}</p>
            </div>
          </div>
        </div>

        {/* Nav — uses the same filtered items as the desktop sidebar */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <NavList items={filteredNavItems} onClose={() => setDrawerOpen(false)} />
        </nav>

        {/* Language + logout */}
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">{t('sidebar.language')}</p>
          <div className="flex gap-1 mb-3">
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 px-2 py-2 rounded-md text-xs font-medium transition-colors ${
                  lang === l ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {l === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0">

        {/* Desktop topbar */}
        <header className="hidden md:flex h-14 bg-white border-b border-slate-100 items-center px-6 gap-4 shrink-0">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            aria-label={sidebarCollapsed ? t('appshell.expandSidebar') : t('appshell.collapseSidebar')}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex-1">
            {/* Date is inherently LTR in both languages after the Gregorian calendar fix */}
            <span className="text-sm text-slate-400" dir="ltr">{dateStr}</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen(!notifOpen)}
              aria-label={t('topbar.notifications')}
              aria-expanded={notifOpen}
              aria-haspopup="true"
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors relative"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="absolute top-1.5 end-1.5 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
            </button>
            {notifOpen && (
              <div className="absolute end-0 top-10 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-900">{t('topbar.notifications')}</p>
                </div>
                {notifications.map((n, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notifTypeColor(n.type)}`} />
                    <div>
                      <p className="text-sm text-slate-700">{n.msg}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* User */}
          <div className="flex items-center gap-2 ps-2 border-s border-slate-100">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              {config.initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-slate-700">{config.userName}</p>
              <p className="text-xs text-slate-400 leading-none">{config.userLabel}</p>
            </div>
          </div>
        </header>

        {/* Mobile topbar */}
        <header className="md:hidden h-14 bg-white border-b border-slate-100 flex items-center px-4 gap-3 shrink-0 z-30">
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label={t('appshell.openNav')}
            aria-expanded={drawerOpen}
            className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>

          <div className="flex-1 flex justify-center">
            <span className="text-sm font-semibold text-slate-900">{pageTitle}</span>
          </div>

          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label={t('topbar.notifications')}
                aria-expanded={notifOpen}
                aria-haspopup="true"
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 transition-colors relative"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span className="absolute top-2 end-2 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
              </button>
              {notifOpen && (
                <div className="absolute end-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white border border-slate-200 rounded-2xl shadow-xl z-50 py-2">
                  <div className="px-4 py-2.5 border-b border-slate-100">
                    <p className="text-sm font-semibold text-slate-900">{t('topbar.notifications')}</p>
                  </div>
                  {notifications.map((n, i) => (
                    <div key={i} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${notifTypeColor(n.type)}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 leading-snug">{n.msg}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{n.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold ms-1">
              {config.initials}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
