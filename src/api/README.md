# API Integration (contract-first)

Source of truth: `WST_OpenAPI_Contract_FROZEN.yaml` (OpenAPI 3.1.0, base path `/api/v1`).

## Setup

1. Copy `.env.example` to `.env`:
   - `VITE_API_BASE_URL=http://localhost:3000/api/v1` (contract `servers[0]`)
   - `VITE_API_DISABLED=true` forces offline demo mode (mock data, no network).
2. `npm install`, `npm run build` (or `npm run dev`).

## Layer (`src/api/`)

| File | Purpose |
|---|---|
| `config.ts` | Base URL resolution + collection defaults (page 1 / pageSize 20 / max 100) |
| `types.ts` | Contract types: Money as decimal string, `{items, page}` collections, `version` concurrency, all enums in SCREAMING form |
| `http.ts` | fetch wrapper: Bearer JWT, `Accept-Language: en\|ar`, `Idempotency-Key`, single-flight 401→refresh→retry, `ApiError` with contract `code` + `requestId` + `Retry-After` |
| `auth.ts` | `POST /auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`, `POST /auth/change-password` |
| `resources.ts` | One function per used `operationId` (customers, vehicles, jobs, inventory, procurement, invoices, training, dashboards, exports, health) |
| `hooks.ts` | `useApiList` / `useApiItem` with loading / typed-error / empty / offline-fallback states |
| `mapping.ts` | UI↔contract maps (stages, priorities, 10 RoleCodes→7 UI roles), `formatMoney`/`toMoney`, `errorMessage(code)` |
| `context/AuthContext.tsx` | Live session via `/auth/me`; offline demo fallback only when backend unreachable (`status 0`) |

## Contract rules enforced

- **Auth**: 401 `INVALID_CREDENTIALS` for unknown user and wrong password alike; rotating refresh tokens (access in memory, refresh in sessionStorage); `mustChangePassword` → `/change-password` screen (Settings → Security for voluntary changes).
- **No public sign-up / reset**: the contract defines neither and the UI has no registration screens; production users come from `POST /users` (`users.manage`).
- **Stages/status**: never `PATCH`ed — job cards use `POST /job-cards/{id}/transitions` with `expectedFromStage`; UI lowercase labels map to `RECEIVED|IN_PROGRESS|QUALITY_CHECK|READY|DELIVERED`.
- **Concurrency**: updates send `version`; stale → `409 VERSION_CONFLICT` ("refresh and retry").
- **Money**: `{amount: decimal-string, currency: ISO-4217}` — never floats.
- **Collections**: `page/pageSize/sort` + `{items, page}`; unknown filters/sorts → 400 (only documented params are sent).
- **Idempotency**: `Idempotency-Key` on part-issue, reservation, stock-adjustment, goods-receipt, payment, certificate-issue POSTs.
- **Exports**: async `POST /exports` (202) → poll → `POST .../download-authorizations` → open short-lived URL; offline falls back to client CSV.
- **Errors**: `ApiError.code` drives messages (`SCHEDULE_CONFLICT`, `INSUFFICIENT_STOCK`, `VERSION_CONFLICT`, `RATE_LIMITED`+`Retry-After`…); 404 also means "outside your scope".
- **Logout**: `POST /auth/logout` revokes the refresh family (best-effort), then clears local tokens.

## Fixed bugs (this pass)

1. No API layer at all (all pages hardcoded mocks) → `src/api/*` + `AuthContext` + contract-bound Customers/JobCards/Dashboard/Settings.
2. Plaintext demo auth as the only login → real JWT login with demo fallback only offline.
3. Fake public registration / password-reset → labeled demo-only (contract has neither endpoint).
4. Lowercase stage/priority strings sent nowhere valid → enum mapping + transitions endpoint.
5. Money as numbers → decimal-string `Money` helpers.
6. Fake pagination (buttons 1-3, all rows) → real `page` envelope + pager.
7. Missing `version` on updates → required in update payloads.
8. Client-side CSV as "exports" → async export-job flow with fallback.
9. Logout without revocation → `POST /auth/logout`.
10. 7 UI roles vs 10 contract RoleCodes → `roleCodeToUiRole` from `/auth/me`.
11. No `Accept-Language` / `Idempotency-Key` / 429 handling → centralized in `http.ts`.
12. No `.env` config → `.env.example` + `VITE_API_BASE_URL`.

## Adopting a remaining page (pattern)

```tsx
import { vehiclesApi } from '../api/resources'
import { useApiList } from '../api/hooks'

const { items, total, loading, error, isFallback, reload, page, setPage } =
  useApiList((q) => vehiclesApi.list(q), { fallbackItems: [], query: { q, sort: 'plate' } })
```

Render `<LoadingRows/>` while loading, `<ApiErrorBanner error onRetry/>` on error,
`<EmptyState/>` when empty, and `<DemoBadge visible={isFallback}/>` when offline.
