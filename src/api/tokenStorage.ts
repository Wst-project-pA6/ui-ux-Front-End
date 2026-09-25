/**
 * Token storage — contract v4 §1.5.
 *
 * accessToken: MEMORY ONLY (never persisted; gone on reload).
 * refreshToken: sessionStorage (per-tab isolation; gone when the tab closes).
 *
 * Neither token is ever stored in localStorage, URLs, or logs.
 */

const REFRESH_KEY = 'wst-refresh-token'

let accessToken: string | null = null
/** Bumped on every clear() so late in-flight refreshes can't restore auth. */
let epoch = 0

function safeGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
}

function safeRemove(key: string): void {
  try {
    sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const tokenStorage = {
  getAccessToken: (): string | null => accessToken,
  getRefreshToken: (): string | null => safeGet(REFRESH_KEY),
  setAccessToken: (token: string): void => {
    accessToken = token
  },
  setRefreshToken: (token: string): void => safeSet(REFRESH_KEY, token),
  clear: (): void => {
    accessToken = null
    safeRemove(REFRESH_KEY)
    epoch += 1
  },
  /** True when a session can exist (refresh token present). */
  hasSession: (): boolean => safeGet(REFRESH_KEY) !== null,
  /** Session generation — refresh results from an older epoch are discarded. */
  getEpoch: (): number => epoch,
}
