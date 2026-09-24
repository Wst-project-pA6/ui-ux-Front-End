import { NavLink, useNavigate } from 'react-router-dom'
import { useLang } from '../../i18n/LanguageContext'
import { useRole } from '../../context/RoleContext'
import { useAuth } from '../../context/AuthContext'
import { NAV_ITEMS, filterNavItems } from '../../config/nav'

interface SidebarProps {
  collapsed: boolean
}

export function Sidebar({ collapsed }: SidebarProps) {
  const navigate = useNavigate()
  const { t, lang, setLang } = useLang()
  const { role, config } = useRole()
  const { hasPermission } = useAuth()

  const visibleItems = filterNavItems(NAV_ITEMS, role, config.allowedPaths, hasPermission)

  return (
    <aside
      className={`h-full bg-slate-900 flex flex-col transition-all duration-300 shrink-0 ${
        collapsed ? 'w-16' : 'w-60'
      }`}
    >
      {/* Logo */}
      <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-800 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">W</span>
        </div>
        {!collapsed && (
          <div>
            <span className="text-white font-bold text-sm">WST</span>
            <p className="text-slate-400 text-xs leading-none mt-0.5">{t('sidebar.subtitle')}</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto">
        {visibleItems.map((item) => {
          const label = t(item.key)
          return (
            <NavLink
              key={item.path}
              to={item.path}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-all duration-150 ${
                  collapsed ? 'justify-center' : ''
                } ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <span className="shrink-0">{item.icon}</span>
              {!collapsed && <span className="text-sm font-medium">{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      {/* Language switcher */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">{t('sidebar.language')}</p>
          <div className="flex gap-1">
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`flex-1 px-2 py-1 rounded-md text-xs font-medium transition-colors ${
                  lang === l ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {l === 'en' ? 'English' : 'العربية'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User */}
      <div className={`border-t border-slate-800 px-4 py-4 ${collapsed ? 'flex justify-center' : ''}`}>
        {collapsed ? (
          <div
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold"
            title={config.userName}
          >
            {config.initials}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {config.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white font-medium truncate">{config.userName}</p>
              <p className="text-xs text-slate-400 truncate">{config.userLabel}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              aria-label={t('nav.logout')}
              title={t('nav.logout')}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
