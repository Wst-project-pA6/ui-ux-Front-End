import { ROLE_CONFIGS, type Role } from '../context/RoleContext'

export interface DemoUser {
  name: string
  email: string
  role: Role
  // stored as plaintext — this is deliberate prototype data, not production auth
  password: string
}

// Seeded accounts: demo password is "Demo@1234" for all.
// Offline fallback only — the live backend is the source of truth.
const SEEDED_USERS: DemoUser[] = Object.entries(ROLE_CONFIGS).map(([role, cfg]) => ({
  name: cfg.userName,
  email: `${role === 'admin' ? 'admin' : role === 'manager' ? 'ahmed' : role === 'advisor' ? 'sara' : role === 'technician' ? 'khalid' : role === 'storekeeper' ? 'nasser' : role === 'supervisor' ? 'sami' : role === 'student' ? 'rayan' : 'layla'}@wst.sa`,
  role: role as Role,
  password: 'Demo@1234',
}))

export function findUserByEmail(email: string): DemoUser | undefined {
  return SEEDED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
}

/** Validates email + password against the seeded demo directory. */
export function authenticate(email: string, password: string): DemoUser | null {
  const user = SEEDED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (!user) return null
  return user.password === password ? user : null
}
