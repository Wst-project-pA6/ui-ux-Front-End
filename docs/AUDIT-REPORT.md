# WST Frontend — Integration & Route Audit Report

> Companion to `STRUCTURE.md`. Findings from the audit of the API integration
> (الربط) and the frontend, with fixes applied and verification results.

## 1. Real Bugs Found and Fixed (4)

### 1.1 Forced password-change dead-end (breaking) — `src/App.tsx`
- Flow: login with `mustChangePassword` → `me` is null → guard bounced
  `/change-password` back to login → user locked out of the form forever.
- Fix: the guard now accepts the stored session (refresh token) as proof
  of authentication for the password route.

### 1.2 Duplicate sidebar nav keys — `src/components/layout/Sidebar.tsx`
- 6 items (notifications, audit-log, bays, service-types,
  technician-profiles, operating-hours) rendered twice with duplicate React
  keys → console warnings on every page. Duplicate block removed.

### 1.3 Wrong prediction status filter — `src/pages/AIInsights.tsx`
- Filter offered `PENDING`; contract enum is
  `ACTIVE / ACCEPTED / OVERRIDDEN / DISMISSED / SUPERSEDED`. Fixed.

### 1.4 Reports polling leak — `src/pages/Reports.tsx`
- Page/status changes spawned new intervals over old ones. Old pollers are
  now cleared on every reload.

## 2. Checked and Correct (no fix needed)

- 3 non-contract single-GET helpers (course/group/assessment) — removed, unused.
- `expectedCompletionAt` required on job create (v6) — enforced in UI.
- `nameAr` on service types — wired (display + create/edit).
- SUBLET approval scope — correctly excluded (invoice cost in v6).
- `UpdateWorkItemDto: PENDING` / transitions to `RECEIVED` — contract
  looseness only; frontend never sends them; backend answers 409.

## 3. Verification Results

| Check | Result |
|---|---|
| `tsc --noEmit` | exit 0 |
| `npm run build` | success |
| Static route audit (30 routes) | 0 mismatches |
| Static link audit (navigate/Link/href + templates) | 0 broken |
| Nav consistency (AppShell/Sidebar/access map) | 0 orphans, 0 duplicates |
| API-call audit (141 calls vs `wst-openapi-final.json`) | 0 mismatches |
| Unauthenticated sweep (28 routes, Playwright) | all redirect to login, no blanks, no JS errors |
| Authenticated sweep (manager login) | all routes render with data, no blanks |
| Logout → Back (qc + student accounts) | lands on login, no session leak |
| Live API probes (dedicated test data) | PO lifecycle, job→invoice→deliver→pay, discounts/sublets, training chain, admin settings — all pass |
| Browser title | `WST – Workshop Manager` (no "Figma Make") |
| i18n | 731 keys, en+ar parity; RTL via `document.dir`; `Accept-Language` sent |

## 4. Environment Notes (not app bugs)

- Azure CORS blocks browser origins like `localhost:4173` — needs backend
  allowlisting; verified via local proxy instead.
- Backend login rate-limiting (429 + long Retry-After) under heavy probing;
  UI surfaces it correctly.
- Two transient connection resets during probing; retries succeeded.
