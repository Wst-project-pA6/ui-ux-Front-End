import { ROLE_CONFIGS, type Role } from '../context/RoleContext'

const STORAGE_KEY = 'wst-demo-users'

export interface DemoUser {
  name: string
  email: string
  role: Role
  // stored as plaintext — this is deliberate prototype data, not production auth
  password: string
}

// Seeded accounts: demo password is "Demo@1234" for all
const SEEDED_USERS: DemoUser[] = Object.entries(ROLE_CONFIGS).map(([role, cfg]) => ({
  name: cfg.userName,
  email: `${role === 'manager' ? 'ahmed' : role === 'advisor' ? 'sara' : role === 'technician' ? 'khalid' : role === 'storekeeper' ? 'nasser' : role === 'supervisor' ? 'sami' : role === 'student' ? 'rayan' : 'layla'}@wst.sa`,
  role: role as Role,
  password: 'Demo@1234',
}))

function getSignedUpUsers(): DemoUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as DemoUser[]) : []
  } catch {
    return []
  }
}

function saveSignedUpUsers(users: DemoUser[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users))
  } catch {}
}

export function getAllUsers(): DemoUser[] {
  return [...SEEDED_USERS, ...getSignedUpUsers()]
}

export function findUserByEmail(email: string): DemoUser | undefined {
  return getAllUsers().find((u) => u.email.toLowerCase() === email.toLowerCase())
}

export function isEmailTaken(email: string): boolean {
  return !!findUserByEmail(email)
}

export function createUser(user: DemoUser): void {
  const existing = getSignedUpUsers()
  saveSignedUpUsers([...existing, user])
}

export function updatePassword(email: string, newPassword: string): boolean {
  // Seeded users are in-memory only — patch them by adding an override in localStorage
  const signed = getSignedUpUsers()
  const idx = signed.findIndex((u) => u.email.toLowerCase() === email.toLowerCase())
  if (idx !== -1) {
    signed[idx] = { ...signed[idx], password: newPassword }
    saveSignedUpUsers(signed)
    return true
  }
  // For seeded accounts we can't mutate the in-memory array so we add an override entry
  const seeded = SEEDED_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase())
  if (seeded) {
    saveSignedUpUsers([...signed, { ...seeded, password: newPassword }])
    return true
  }
  return false
}

/** Validates email + password against the merged demo directory. */
export function authenticate(email: string, password: string): DemoUser | null {
  // For seeded users that have been overridden, the override entry shadows the seeded one
  // getAllUsers() puts seeded first, then signed-up. We need to pick the last match for email.
  const all = getAllUsers()
  // Collect all entries for this email; use the last one (overrides win)
  const matches = all.filter((u) => u.email.toLowerCase() === email.toLowerCase())
  if (matches.length === 0) return null
  const user = matches[matches.length - 1]
  return user.password === password ? user : null
}

const CHARSET_UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const CHARSET_LOWER = 'abcdefghijklmnopqrstuvwxyz'
const CHARSET_DIGIT = '0123456789'
const CHARSET_SPECIAL = '!@#$%^&*'

export function generateTempPassword(): string {
  const rand = (s: string) => s[Math.floor(Math.random() * s.length)]
  const base = [
    rand(CHARSET_UPPER),
    rand(CHARSET_LOWER),
    rand(CHARSET_DIGIT),
    rand(CHARSET_SPECIAL),
    ...Array.from({ length: 6 }, () =>
      rand(CHARSET_UPPER + CHARSET_LOWER + CHARSET_DIGIT)
    ),
  ]
  // Shuffle
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[base[i], base[j]] = [base[j], base[i]]
  }
  return base.join('')
}

export interface PasswordStrength {
  hasLength: boolean
  hasUpper: boolean
  hasLower: boolean
  hasDigit: boolean
  hasSpecial: boolean
}

export function checkStrength(pw: string): PasswordStrength {
  return {
    hasLength: pw.length >= 12,
    hasUpper: /[A-Z]/.test(pw),
    hasLower: /[a-z]/.test(pw),
    hasDigit: /[0-9]/.test(pw),
    hasSpecial: /[^A-Za-z0-9]/.test(pw),
  }
}

export function strengthScore(s: PasswordStrength): number {
  return Object.values(s).filter(Boolean).length
}

export function isStrongEnough(pw: string): boolean {
  const s = checkStrength(pw)
  return Object.values(s).every(Boolean)
}
