# WST Frontend — Structure Report

> This document describes the architecture, folders, routes, permissions,
> integration rules, and workflow followed in this repository.

## 1. Architecture Overview

```
UI Pages  →  API Modules (v3/v4/v6)  →  HTTP Client  →  Backend (/api/v1)
                ↑                               ↑
          AuthContext (/auth/me)          tokenStorage + single-flight refresh
                ↓
        Permission guards (access.ts) → Routes / Sidebar / Buttons
```

## 2. Folder Structure

```
src/
├── api/
│   ├── client.ts          # Central fetch: Bearer, single-flight refresh,
│   │                      # Idempotency-Key, multipart, blob download
│   ├── errors.ts          # ApiError: code / message / requestId / details / conflicts
│   ├── tokenStorage.ts    # access token in memory only + refresh in sessionStorage
│   ├── schema.ts          # Generated from wst-openapi-final.json (openapi-typescript)
│   ├── endpoints.ts       # Correct authApi + re-exports (legacy helpers removed)
│   ├── useApi.ts          # Generic hook (currently unused)
│   ├── v3/                # Contract v3: customers, vehicles, workshop,
│   │                      #   jobs, platform, types
│   ├── v4/                # Contract v4: purchasing, management (invoices/users/config)
│   └── v6/                # Contract v6: training, insights (dashboards/exports/AI)
├── auth/
│   └── access.ts          # ROUTE_PERMISSIONS + canAccessPath +
│                          #   homeForPermissions + NAV_ORDER
├── context/
│   └── AuthContext.tsx    # login / logout / me / bootstrap /
│                          #   forced-password / logout
├── components/
│   ├── layout/            # AppShell (identity + bell) + Sidebar (navigation)
│   ├── notifications/     # NotificationBell + 45s polling
│   ├── common/            # ApiStates (loading / empty / error)
│   └── ui/                # PageHeader, Badge, Button, Modal, Input,
│                          #   ConfirmDialog, Toast
├── pages/                 # 25 pages (see route map below)
├── i18n/                  # translations.ts (731 keys, en+ar) +
│                          #   LanguageContext (RTL)
├── App.tsx                # Route definitions + guards
└── main.tsx               # ToastProvider → AuthProvider → App
```

## 3. Route Map (30 routes)

| Public | Protected (permission-guarded) |
|---|---|
| `/` login | `/dashboard` (any permitted dashboard) |
| `/verify/:token` public verification | `/job-cards`, `/job-cards/:id`, `/my-jobs` |
| | `/customers`, `/vehicles`, `/bays`, `/service-types`, `/technician-profiles`, `/operating-hours` |
| | `/inventory`, `/purchasing`, `/invoices`, `/invoices/:id`, `/invoices/:id/print` |
| | `/training`, `/my-training`, `/assessments`, `/competencies`, `/certificates` |
| | `/reports`, `/ai-insights`, `/notifications`, `/audit-log`, `/settings`, `/role-matrix`, `/change-password` |

## 4. Permission Layers

- Single source of truth: `GET /auth/me` → `permissions` (roles are display-only).
- `access.ts`: every route → permission list (any-of); empty list = any signed-in user.
- Guard order: `bootstrapping → login → mustChangePassword → permission → home`.
- Hiding buttons is UI-only; the backend is the final authority.

## 5. Fixed Integration Rules

- Money = strings (no float arithmetic); `version` with every edit + 409 handling.
- New `Idempotency-Key` per action; `multipart` without manual Content-Type.
- ISO-Z dates; server-side pagination.
- Errors: `{code, message, requestId, details}` — branch on `code`, show `message` with `requestId`.

## 6. Git Branches

- `feat/api-v3-integration` → v3 integration.
- `feat/api-v4-integration` → v1/v2 audit fixes + v4 integration.
- `feat/api-v6-integration` → v6 integration + full audit (current, pushed and clean).

## 7. Verification Workflow

`tsc` + `build` + static audits (routes / links / API calls vs contract)
+ `scripts/smoke-test.mjs` (Playwright: login, 28 routes, logout + back)
+ direct live-backend probes with dedicated test data.
