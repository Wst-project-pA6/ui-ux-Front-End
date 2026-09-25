const ACCESS_KEY = 'wst-access-token'
const REFRESH_KEY = 'wst-refresh-token'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* storage unavailable (private mode) — session stays in memory only */
  }
}

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const tokenStorage = {
  getAccessToken: (): string | null => safeGet(ACCESS_KEY),
  getRefreshToken: (): string | null => safeGet(REFRESH_KEY),
  setAccessToken: (token: string): void => safeSet(ACCESS_KEY, token),
  setRefreshToken: (token: string): void => safeSet(REFRESH_KEY, token),
  clear: (): void => {
    safeRemove(ACCESS_KEY)
    safeRemove(REFRESH_KEY)
  },
  hasSession: (): boolean => safeGet(ACCESS_KEY) !== null,
}
