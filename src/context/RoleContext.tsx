import React, { createContext, useContext, useState, useCallback } from 'react'

export type Role =
  | 'manager'
  | 'advisor'
  | 'technician'
  | 'storekeeper'
  | 'supervisor'
  | 'student'
  | 'finance'

export interface RoleConfig {
  label: string
  homeRoute: string
  allowedPaths: string[]
  userName: string
  userLabel: string
  initials: string
}

export const ROLE_CONFIGS: Record<Role, RoleConfig> = {
  manager: {
    label: 'Workshop Manager',
    homeRoute: '/dashboard',
    allowedPaths: [
      '/dashboard',
      '/customers',
      '/vehicles',
      '/job-cards',
      '/inventory',
      '/purchasing',
      '/assessments',
      '/competencies',
      '/reports',
      '/ai-insights',
      '/settings',
    ],
    userName: 'Ahmed M.',
    userLabel: 'Workshop Manager',
    initials: 'AM',
  },
  advisor: {
    label: 'Service Advisor',
    homeRoute: '/job-cards',
    allowedPaths: ['/job-cards', '/customers', '/vehicles'],
    userName: 'Sara K.',
    userLabel: 'Service Advisor',
    initials: 'SK',
  },
  technician: {
    label: 'Technician / QC',
    homeRoute: '/my-jobs',
    allowedPaths: ['/my-jobs'],
    userName: 'Khalid H.',
    userLabel: 'Technician',
    initials: 'KH',
  },
  storekeeper: {
    label: 'Storekeeper / Procurement',
    homeRoute: '/inventory',
    allowedPaths: ['/inventory', '/purchasing'],
    userName: 'Nasser K.',
    userLabel: 'Storekeeper',
    initials: 'NK',
  },
  supervisor: {
    label: 'Training Supervisor',
    homeRoute: '/training',
    allowedPaths: ['/training', '/assessments', '/competencies', '/role-matrix'],
    userName: 'Eng. Sami R.',
    userLabel: 'Training Supervisor',
    initials: 'SR',
  },
  student: {
    label: 'Student',
    homeRoute: '/my-training',
    allowedPaths: ['/my-training', '/training'],
    userName: 'Rayan O.',
    userLabel: 'Student Technician',
    initials: 'RO',
  },
  finance: {
    label: 'Finance Viewer / Auditor',
    homeRoute: '/invoices',
    allowedPaths: ['/invoices'],
    userName: 'Layla F.',
    userLabel: 'Finance Auditor',
    initials: 'LF',
  },
}

export const ALL_ROLES = Object.keys(ROLE_CONFIGS) as Role[]

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

interface RoleContextValue {
  role: Role
  setRole: (r: Role) => void
  userName: string
  setUserName: (name: string) => void
  config: RoleConfig
  canAccess: (path: string) => boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

const VALID_ROLES = new Set<Role>(['manager', 'advisor', 'technician', 'storekeeper', 'supervisor', 'student', 'finance'])

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    try {
      const stored = localStorage.getItem('wst-role')
      if (stored && VALID_ROLES.has(stored as Role)) return stored as Role
    } catch {}
    return 'manager'
  })

  const [userName, setUserNameState] = useState<string>(() => {
    try {
      return localStorage.getItem('wst-user-name') ?? ''
    } catch {
      return ''
    }
  })

  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    try { localStorage.setItem('wst-role', r) } catch {}
  }, [])

  const setUserName = useCallback((name: string) => {
    setUserNameState(name)
    try { localStorage.setItem('wst-user-name', name) } catch {}
  }, [])

  const baseConfig = ROLE_CONFIGS[role]
  // Override static userName/initials with the authenticated user's real name when available
  const config: RoleConfig = userName
    ? { ...baseConfig, userName, initials: initials(userName) }
    : baseConfig

  const canAccess = useCallback(
    (path: string) => config.allowedPaths.includes(path),
    [config]
  )

  return (
    <RoleContext.Provider value={{ role, setRole, userName, setUserName, config, canAccess }}>
      {children}
    </RoleContext.Provider>
  )
}

const DEFAULT_ROLE_CTX: RoleContextValue = {
  role: 'manager',
  setRole: () => {},
  userName: '',
  setUserName: () => {},
  config: ROLE_CONFIGS['manager'],
  canAccess: () => false,
}

export function useRole() {
  return useContext(RoleContext) ?? DEFAULT_ROLE_CTX
}
