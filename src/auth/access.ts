/**
 * Permission-based access control — the single source of truth is
 * GET /auth/me → permissions. Backend roles are display/business data only.
 *
 * An empty permission list means "any signed-in user" (e.g. notifications,
 * non-final mock screens). Frontend checks are UI convenience only.
 */

/** Path → permissions (ANY-OF). Base segment is used for nested routes. */
export const ROUTE_PERMISSIONS: Record<string, string[]> = {
  '/dashboard': [],
  '/customers': ['customers.read'],
  '/vehicles': ['vehicles.read'],
  '/job-cards': ['jobs.read', 'jobs.read.assigned', 'jobs.read.quality-scope'],
  '/my-jobs': ['jobs.read.assigned', 'jobs.read'],
  '/bays': ['bays.read'],
  '/service-types': ['service-types.read', 'service-types.manage'],
  '/technician-profiles': ['technician-profiles.read', 'technician-profiles.manage'],
  '/operating-hours': ['operating-hours.read', 'operating-hours.manage'],
  '/inventory': ['parts.read', 'inventory.read', 'inventory.stock.read'],
  '/purchasing': [
    'purchasing.read',
    'purchasing.create',
    'purchasing.approve',
    'purchasing.receive',
    'vendors.read',
  ],
  '/invoices': ['invoices.read', 'invoices.manage', 'payments.record'],
  '/notifications': [],
  '/audit-log': ['audit.read'],
  '/settings': ['users.read', 'config.read', 'config.manage'],
  // Not final — mock screens with Demo badge, open to any signed-in user.
  '/training': [],
  '/my-training': [],
  '/assessments': [],
  '/competencies': [],
  '/reports': [],
  '/ai-insights': [],
  '/role-matrix': [],
  '/change-password': [],
}

function basePath(path: string): string {
  return '/' + path.split('/').filter(Boolean)[0]
}

/** True when the permission set grants access to the path (or its base). */
export function canAccessPath(permissions: string[], path: string): boolean {
  const required = ROUTE_PERMISSIONS[path] ?? ROUTE_PERMISSIONS[basePath(path)]
  if (required === undefined) return false
  if (required.length === 0) return true
  return required.some((p) => permissions.includes(p))
}

/** Landing screen by backend permission — never a role picker. */
export function homeForPermissions(permissions: string[]): string {
  if (permissions.includes('jobs.read.assigned')) return '/my-jobs'
  if (
    permissions.includes('jobs.read') ||
    permissions.includes('jobs.create') ||
    permissions.includes('customers.read')
  )
    return '/job-cards'
  if (
    permissions.includes('parts.read') ||
    permissions.includes('inventory.read') ||
    permissions.includes('inventory.stock.read')
  )
    return '/inventory'
  if (permissions.includes('purchasing.read') || permissions.includes('purchasing.create'))
    return '/purchasing'
  if (permissions.includes('invoices.read')) return '/invoices'
  if (permissions.includes('audit.read')) return '/audit-log'
  if (permissions.includes('users.read') || permissions.includes('config.read')) return '/settings'
  return '/dashboard'
}

/** Sidebar order. Visibility is decided by canAccessPath. */
export const NAV_ORDER: string[] = [
  '/dashboard',
  '/job-cards',
  '/my-jobs',
  '/customers',
  '/vehicles',
  '/bays',
  '/service-types',
  '/technician-profiles',
  '/operating-hours',
  '/inventory',
  '/purchasing',
  '/invoices',
  '/notifications',
  '/audit-log',
  '/training',
  '/my-training',
  '/assessments',
  '/competencies',
  '/reports',
  '/ai-insights',
  '/role-matrix',
  '/settings',
]

/** Two-letter initials from a backend displayName. */
export function initialsFor(name?: string | null): string {
  if (!name) return '••'
  const parts = name.trim().split(/\s+/)
  return (parts[0]?.[0] ?? '') + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '') || '••'
}
