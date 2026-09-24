# WST — Workshop Management & Student Practical Training (Frontend)

React + Vite + Tailwind CSS v4 frontend for the WST platform: workshop jobs,
customers/vehicles, parts inventory, purchasing, training, assessments,
competencies, reporting, and AI/data insights — bilingual (EN/AR with RTL).

## Backend contract

The backend (`Wst-project-pA6/app`, NestJS, OpenAPI `WST_OpenAPI_Contract_FROZEN`)
is the source of truth for all API integrations. The frontend never invents
endpoints, payloads, or permissions:

- Contract-first client: `src/api/` (`config`, `http` with Bearer JWT +
  `Accept-Language` + Idempotency-Key + single-flight 401→refresh→retry,
  `auth`, `resources` — one function per used operationId, `hooks`
  with loading / typed-error / empty / offline-fallback, `mapping`,
  `types`)
- Auth: live session via `GET /auth/me` (`src/context/AuthContext`);
  offline demo fallback ONLY when the backend is unreachable (status 0),
  always labeled with `DemoBadge`
- Dev: `VITE_API_BASE_URL` (see `.env.example`); `vite.config.ts` proxies
  `/api` → `http://localhost:3000` (override with `WST_API_PROXY_TARGET`)

## Roles & navigation

| Role | Home | Access |
| ---- | ---- | ------ |
| Workshop Manager | `/dashboard` | Dashboard, customers, vehicles, job cards, inventory, purchasing, assessments, competencies, reports, AI insights, settings (users/general/security) |
| Service Advisor | `/job-cards` | Job cards, customers, vehicles |
| Technician / QC | `/my-jobs` | Assigned jobs |
| Storekeeper / Procurement | `/inventory` | Inventory, purchasing |
| Training Supervisor | `/training` | Training, assessments, competencies, role matrix |
| Student | `/my-training` | My training + training catalog (read-only) |
| Finance Viewer / Auditor | `/invoices` | Invoices (read-only + export) |

Training was moved out of Workshop Manager to the Student role (read-only
browse) and Training Supervisor (management). The permission matrix lives at
`/role-matrix` (outside Workshop Manager). The design system is documented in
`design-system/` and is not an app route.

## Scripts

- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run preview` — preview production build
- `npm run format` — format with oxfmt
- `node scripts/capture-wireframes.mjs` — capture `wireframes/` screenshots
  (requires preview server on :4173; uses installed Chrome via playwright-core)
- `node scripts/smoke-test.mjs` — button sweep + key flows against preview

## Project layout

```
src/
  api/            contract-bound backend client + hooks + mapping
  components/     layout (AppShell/Sidebar), ui primitives, settings
  config/         central navigation definition
  context/        auth session + role-based access (visibility only)
  i18n/           English/Arabic translations + RTL
  pages/          one module per route (+ SignUp/ForgotPassword demo-labeled)
  utils/          csv export, demo auth helpers
design-system/    tokens (W3C DTCG JSON) + documentation (not a route)
wireframes/       screenshots of the final screens
reports/          task completion reports
```
