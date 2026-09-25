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
      '/bays',
      '/service-types',
      '/technician-profiles',
      '/operating-hours',
      '/notifications',
      '/audit-log',
    ],
    userName: 'Ahmed M.',
    userLabel: 'Workshop Manager',
    initials: 'AM',
  },
  advisor: {
    label: 'Service Advisor',
    homeRoute: '/job-cards',
    allowedPaths: ['/job-cards', '/customers', '/vehicles', '/notifications'],
    userName: 'Sara K.',
    userLabel: 'Service Advisor',
    initials: 'SK',
  },
  technician: {
    label: 'Technician / QC',
    homeRoute: '/my-jobs',
    allowedPaths: ['/my-jobs', '/notifications'],
    userName: 'Khalid H.',
    userLabel: 'Technician',
    initials: 'KH',
  },
  storekeeper: {
    label: 'Storekeeper / Procurement',
    homeRoute: '/inventory',
    allowedPaths: ['/inventory', '/purchasing', '/notifications'],
    userName: 'Nasser K.',
    userLabel: 'Storekeeper',
    initials: 'NK',
  },
  supervisor: {
    label: 'Training Supervisor',
    homeRoute: '/training',
    allowedPaths: ['/training', '/assessments', '/competencies', '/role-matrix', '/notifications', '/bays'],
    userName: 'Eng. Sami R.',
    userLabel: 'Training Supervisor',
    initials: 'SR',
  },
  student: {
    label: 'Student',
    homeRoute: '/my-training',
    allowedPaths: ['/my-training', '/training', '/notifications'],
    userName: 'Rayan O.',
    userLabel: 'Student Technician',
    initials: 'RO',
  },
  finance: {
    label: 'Finance Viewer / Auditor',
    homeRoute: '/invoices',
    allowedPaths: ['/invoices', '/notifications', '/audit-log'],
    userName: 'Layla F.',
    userLabel: 'Finance Auditor',
    initials: 'LF',
  },
}

export const ALL_ROLES = Object.keys(ROLE_CONFIGS) as Role[]

interface RoleContextValue {
  role: Role
  setRole: (r: Role) => void
  config: RoleConfig
  canAccess: (path: string) => boolean
}

const RoleContext = createContext<RoleContextValue | null>(null)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRoleState] = useState<Role>(() => {
    try {
      return (localStorage.getItem('wst-role') as Role) ?? 'manager'
    } catch {
      return 'manager'
    }
  })

  const setRole = useCallback((r: Role) => {
    setRoleState(r)
    try {
      localStorage.setItem('wst-role', r)
    } catch {}
  }, [])

  const config = ROLE_CONFIGS[role]

  const canAccess = useCallback(
    (path: string) => config.allowedPaths.includes(path),
    [config]
  )

  return (
    <RoleContext.Provider value={{ role, setRole, config, canAccess }}>
      {children}
    </RoleContext.Provider>
  )
}

const DEFAULT_ROLE_CTX: RoleContextValue = {
  role: 'manager',
  setRole: () => {},
  config: ROLE_CONFIGS['manager'],
  canAccess: () => true,
}

export function useRole() {
  return useContext(RoleContext) ?? DEFAULT_ROLE_CTX
}
