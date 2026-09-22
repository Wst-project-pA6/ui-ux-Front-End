# API Integration (implemented backend)

Source of truth: the NestJS controllers under `backend/src/modules/*`
(`wst-workshop-manager-main/backend`), served under base path `/api/v1`.
Do not invent routes: the backend uses whitelist validation and rejects
unknown paths, properties, filters, and sorts.

## Setup

1. Copy `.env.example` to `.env`:
   - `VITE_API_BASE_URL=http://localhost:3000/api/v1`
   - `VITE_API_DISABLED=true` forces offline demo mode (mock data, no network).
2. `npm install`, `npm run build` (or `npm run dev`).
   The Vite dev server proxies relative `/api` to `http://localhost:3000`
   (override with `VITE_API_PROXY_TARGET`).

## Layer (`src/api/`)

| File | Purpose |
|---|---|
| `config.ts` | Base URL resolution + collection defaults (page 1 / pageSize 20 / max 100) |
| `types.ts` | Backend shapes: Money as decimal string, `{items, page}` collections, `version` concurrency, SCREAMING enums |
| `http.ts` | fetch wrapper: Bearer JWT, `Accept-Language: en\|ar`, `Idempotency-Key`, single-flight 401→refresh→retry, `ApiError` with `code` + `requestId` + `Retry-After` |
| `auth.ts` | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/change-password`, `GET /auth/me` |
| `resources.ts` | One client per implemented controller (customers, vehicles, jobs, approvals, inventory, labor, quality, purchasing, access/users, invoices, bays, training, health) |
| `hooks.ts` | `useApiList` / `useApiItem` with loading / typed-error / empty / offline-fallback states |
| `mapping.ts` | UI↔backend maps (stages, priorities, 10 RoleCodes→7 UI roles), `formatMoney`/`toMoney`, `errorMessage(code)` |
| `identity.ts` | `isUuid()` guard for routes protected by `ParseUUIDPipe` |
| `context/AuthContext.tsx` | Live session via `/auth/me`; offline demo fallback only when backend unreachable (`status 0`) |

## Backend rules enforced

- **Auth**: 401 `INVALID_CREDENTIALS` for unknown user and wrong password alike; rotating refresh tokens; `mustChangePassword` → `/settings` Security tab. Registration (`POST /auth/register`) creates a pending-access account and never signs in.
- **Users**: backend identifies users by UUID, never email. Admin edits use `PATCH /users/{id}`, role changes use `PUT /users/{id}/roles`.
- **Stages/status**: never `PATCH`ed — job cards use `POST /job-cards/{id}/transitions` with `expectedFromStage`. Training sessions have no status-transition endpoint in this backend.
- **Concurrency**: updates send `version`; stale → `409 VERSION_CONFLICT` ("refresh and retry").
- **Money**: `{amount: decimal-string, currency: ISO-4217}` — never floats.
- **Collections**: `page/pageSize/sort` + `{items, page}`; unknown filters/sorts → 400 (only documented params are sent).
- **Idempotency**: `Idempotency-Key` on part-issue, part-issue reversal, part-reservation, stock-adjustment, goods-receipt, and invoice-payment POSTs.
- **Not implemented here**: dashboards, async exports/download authorizations, assessments, and certificates. Those screens stay read-only and never call missing routes.
- **Errors**: `ApiError.code` drives messages (`SCHEDULE_CONFLICT`, `INSUFFICIENT_STOCK`, `VERSION_CONFLICT`, `RATE_LIMITED`+`Retry-After`…); 404 also means "outside your scope".
- **Logout**: `POST /auth/logout` revokes the refresh family (best-effort), then clears local tokens.
- **Vehicles**: updates accept only `plate`, `mileage` (must increase), and `status`. VIN is required on create and must match `^[A-HJ-NPR-Z0-9]{17}$`.
- **Jobs**: creation derives the customer from the vehicle; bay/technician assignment is a separate `PUT /job-cards/{id}/assignment`. Purchase-order rejection requires a reason; new orders start `DRAFT` and move via `POST .../transitions`.

## Adopting a remaining page (pattern)

```tsx
import { vehiclesApi } from '../api/resources'
import { useApiList } from '../api/hooks'

const { items, total, loading, error, isFallback, reload, page, setPage } =
  useApiList((q) => vehiclesApi.list(q), { fallbackItems: [], query: { q, sort: 'plate' } })
```

Render `<LoadingRows/>` while loading, `<ApiErrorBanner error onRetry/>` on error,
`<EmptyState/>` when empty, and `<DemoBadge visible={isFallback}/>` when offline.
