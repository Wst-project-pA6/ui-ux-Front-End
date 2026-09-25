# WST — Workshop Management & Student Practical Training (Frontend)

React + Vite + Tailwind CSS v4 frontend for the WST platform: workshop jobs,
customers/vehicles, parts inventory, purchasing, training, assessments,
competencies, reporting, and AI/data insights — bilingual (EN/AR with RTL).

## Backend contract

The backend (`Wst-project-pA6/app`, NestJS) is the source of truth for all
API integrations. The frontend never invents endpoints, payloads, or
permissions:

- Typed API client: `src/api/client.ts` (JWT bearer + refresh retry,
  `Accept-Language` negotiation)
- Verified endpoint wrappers: `src/api/endpoints.ts` (paths verified against
  the backend NestJS controllers)
- Auth: `POST /auth/login` → token pair → `localStorage`
  (`src/api/tokenStorage.ts`)
- Dev proxy: `vite.config.ts` forwards `/api` to `http://localhost:3000`
  (override with `WST_API_PROXY_TARGET`); production base URL via
  `VITE_API_BASE_URL` (see `.env.example`)

If the backend is unreachable, the app runs in explicit demo mode with local
seed data and labels it as such — never a fake success.

## Roles & navigation

| Role | Home | Access |
| ---- | ---- | ------ |
| Workshop Manager | `/dashboard` | Dashboard, customers, vehicles, job cards, inventory, purchasing, assessments, competencies, reports, AI insights, settings |
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

## Project layout

```
src/
  api/            verified backend client + endpoints + query hook
  components/     layout (AppShell/Sidebar), ui primitives, settings
  context/        role-based access (frontend visibility only)
  i18n/           English/Arabic translations + RTL
  pages/          one module per route
  utils/          csv export helpers
design-system/    tokens + component documentation (not a route)
wireframes/       screenshots of the final screens
```
