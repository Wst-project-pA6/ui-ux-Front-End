// WST API contract binding — central configuration.
// Contract: WST_OpenAPI_Contract_FROZEN.yaml (OpenAPI 3.1.0, base path /api/v1).

/// Base URL resolution:
/// 1. `VITE_API_BASE_URL` when set (e.g. http://localhost:3000/api/v1)
/// 2. Same-origin `/api/v1` when a backend is served alongside the frontend
/// 3. Local dev default `http://localhost:3000/api/v1` (contract `servers[0]`)
export function getApiBaseUrl(): string {
  const fromEnv = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  return 'http://localhost:3000/api/v1'
}

export const CONTRACT = {
  defaultPage: 1,
  defaultPageSize: 20,
  maxPageSize: 100,
  idempotencyHeader: 'Idempotency-Key',
  languageHeader: 'Accept-Language',
} as const

export function getApiMode(): 'live' | 'demo' {
  // Explicit opt-out: VITE_API_DISABLED=true forces demo/mock mode.
  if ((import.meta.env.VITE_API_DISABLED as string | undefined) === 'true') return 'demo'
  return 'live'
}
