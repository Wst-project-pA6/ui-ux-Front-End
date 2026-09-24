# WST Design Audit — Lead Engineer Brief

**Project:** WST — Workshop Management & Student Practical Training  
**Stack:** React · TypeScript · Tailwind CSS v4 · react-router · recharts · Figma Make  
**Mode:** Production-track audit & correction pass — not a greenfield build.

---

## Binding Context

Three earlier documents are authoritative for anything this brief does not address:

| Document | Authority |
|---|---|
| Original design-system brief | Visual identity, token system, component API |
| Mobile-redesign brief (360/390/430 px) | Responsive rules and touch targets |
| Localization/RTL brief (English/Arabic) | String handling, direction, calendar |

Where this brief repeats or sharpens something from those documents, **this brief is authoritative.** Where it is silent, defer to them.

---

## Step 0 — Mandatory Analysis Pass

> **Do not edit any file until this map exists.** Instinct-driven edits on a system this large produce new bugs faster than they fix old ones.

### 0-A · Routing & Access Map

Read all four sources in parallel and cross-reference them into a single table:

1. Every route declared in `App.tsx`
2. Every path in `RoleContext.tsx` → `ROLE_CONFIGS[*].allowedPaths`
3. Every nav item in `Sidebar.tsx`
4. Every nav item in `AppShell.tsx`'s own nav list
5. Every entry in `AppShell.tsx` → `pageTitleKeys`

**Flag:**
- Any route present in one source but absent from another
- Any nav item that has no matching route (dead link)
- Any route that has no matching nav item (orphaned page)
- Any role-visibility rule that differs between the desktop Sidebar and the mobile drawer for the same role

### 0-B · Translation Coverage Map

1. Enumerate every `t('...')` call and every dynamic `t(someKey)` reference in `src/pages/` and `src/components/`
2. Enumerate every key defined in both `en` and `ar` blocks of `translations.ts`

**Flag:**
- **(a)** Any component that imports/destructures `useLang()` / `t` but never calls it → silently unlocalized screen
- **(b)** Any key referenced in code but absent from either language block
- **(c)** Any hardcoded user-visible English string that lives next to already-localized siblings in the same component

### 0-C · Design-Token Map

1. List every value defined in `index.css` under `@theme` and `:root`
2. Scan all components for raw hex codes, arbitrary Tailwind values (`bg-[#...]`, `p-[13px]`), and spacing numbers outside the 4/8/12/16/24/32/40/48/64 px scale

**Flag** every deviation. The goal is one token system used everywhere, not a token system that coexists with ad-hoc values.

### 0-D · Business-Logic Map

1. For every interactive control that implies a state change (status transitions, sign-offs, approvals, stock deductions, certificate issuance), confirm there is an actual handler that mutates state — not just a styled button.
2. Cross-check the permission matrix in `Settings.tsx` against what each role's own screens actually let that role do.

**Flag:**
- Any button that is visually wired but functionally inert
- Any contradiction between the matrix and the live UI (a role blocked by the matrix that the UI allows, or a role allowed by the matrix that the UI blocks)

---

## Global Rules

Apply these to **every** change made during this pass.

| Rule | Detail |
|---|---|
| Preserve existing routes & features | Do not create duplicate pages or components; extend existing shared ones (`Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card` / `KPICard`, `Modal`, `PageHeader`, `Table`, `Sidebar`) |
| Single nav source of truth | Exactly one nav config, read by both the desktop Sidebar and the mobile drawer — never two independently maintained arrays |
| All user-visible strings through `t()` | If a component imports `useLang()`, every visible string in that component must be localized — no partial coverage |
| Identifiers always LTR | Job numbers, PO numbers, SKUs, VINs, plates, amounts, phone numbers — always LTR, even mid-Arabic-sentence |
| Logical Tailwind utilities | Use `start`/`end`, `ms`/`me`, `ps`/`pe` — never physical `left`/`right`/`ml`/`mr`/`pl`/`pr` |
| Language switch preserves state | Current page, tab, filters, form values, selected record, open modal must all survive a language toggle |
| Desktop layout (1440 px) is frozen | Do not alter desktop layout unless a fix explicitly requires it to correct a real defect; mobile improvements must not regress desktop |
| WST token system only | Color, typography, spacing, and radius stay within `--color-wst-*` and the 8 px spacing scale (8/10/12/16/20 px radii). No new colors, gradients, glassmorphism, or decorative additions |
| Keep `ProtectedRoute` intact | Backend auth is out of scope; never remove or weaken the client-side guard while cleaning up routing |

---

## Verified Defects

Each item below is a confirmed defect, not a suggestion. Treat each as an acceptance criterion.

### A · Shared Navigation & Shell Consistency

| # | Defect | Acceptance Criterion |
|---|---|---|
| A-1 | `Sidebar.tsx` and `AppShell.tsx` each define their own nav-item array | Consolidate into one exported config (e.g. `nav.ts` or exported from `Sidebar.tsx`) imported by both |
| A-2 | `/design-system` is hidden from non-manager roles in the mobile drawer but **not** in the desktop Sidebar, because the desktop filter uses `allowedPaths` which includes it for every role | After A-1, the manager-only rule must apply identically on both surfaces |
| A-3 | `AppShell.tsx`'s `NavList` component is defined inside the `AppShell` function body, recreated on every render | Move to module scope or its own component; pass filtered items as a prop |
| A-4 | `pageTitleKeys` maps `/my-jobs`, `/my-training`, `/invoices`, `/design-system` to hardcoded English strings | Add real translation keys for all four; resolve through `t()` |

### B · Localization Completeness

| # | Defect | Acceptance Criterion |
|---|---|---|
| B-1 | `MyJobs.tsx` imports and destructures `t` but never calls it — every string (title, subtitle, statuses, checklist header, modal labels, buttons) is a raw English literal | Localize completely, matching the pattern in `Assessments.tsx` / `Inventory.tsx` |
| B-2 | Same page formats today's date with `toLocaleDateString('en-US', ...)` unconditionally | Respect active language |
| B-3 | `ROLE_CONFIGS[*].label` in `RoleContext.tsx` and the "select a role to preview" helper text in `Login.tsx` are hardcoded English | Route through `t()` |
| B-4 | `AppShell.tsx` topbar uses `'ar-SA'` locale, silently rendering Hijri calendar with Eastern Arabic numerals | Use `'ar-SA-u-ca-gregory'` (or `'ar-EG'`); remove forced `dir="ltr"` on that span once calendar is consistent |
| B-5 | The "imports `t`, doesn't fully use it" pattern may exist beyond `MyJobs.tsx` | Sweep every page — verify coverage per string, per page, not just per component |

### C · Authentication UI

| # | Defect | Acceptance Criterion |
|---|---|---|
| C-1 | `Login.tsx` has no validation | Add: valid-email check, non-empty-password check, both with localized inline error messages; keep existing prototype role-picker |
| C-2 | Shared `Input` component may not forward `required`, may not set `aria-invalid` / `aria-describedby` on error, and may derive its `id` from the label text rather than `React.useId()` | Fix once in the shared component — this affects every form in the app |

### D · Technician Workflow / State Wiring

| # | Defect | Acceptance Criterion |
|---|---|---|
| D-1 | `MyJobs.tsx` footer actions `Start Work`, `Send to Quality Check`, `Mark Ready` have no `onClick` | Wire to advance the job through Received → In Progress → Quality Check → Ready, using the same stage machine as `JobCards.tsx` |
| D-2 | "Add Labor" and "Issue Part" modals close on submit with no validation and no state effect | Append to the selected job's `laborLogged` / `partsIssued`; for parts, deduct from shared inventory (WST-FR-06: no negative stock, reversible with reason) |
| D-3 | Work checklist inside the job detail modal is display-only | Make each item toggleable by the assigned technician; reflect updated completion count and progress bar immediately |

### E · RBAC / Permission-Matrix Consistency

| # | Defect | Acceptance Criterion |
|---|---|---|
| E-1 | `Settings.tsx` permission matrix marks `Technician` as `create: false`, contradicting the technician's own workflow (log labor, issue parts — WST-FR-06) | Reconcile: if the matrix is right, the UI must not offer the action; if the UI is right, update the matrix |
| E-2 | Neither `manager` nor `advisor` has `/invoices` in `allowedPaths`, though invoices should be visible to workshop management | Add `/invoices` for both; confirm sidebar and route guard reflect the change |
| E-3 | Default (unauthenticated) role context has `canAccess: () => true` | Replace with a permissive-failure-safe default (`canAccess: () => false`) |

### F · RTL / Direction Timing

| # | Defect | Acceptance Criterion |
|---|---|---|
| F-1 | `LanguageContext.tsx` sets `document.documentElement.dir` / `lang` in a plain `useEffect`, causing a visible LTR→RTL flash on reload with a stored Arabic preference | Move to `useLayoutEffect`, or set synchronously before mount |

### G · Mobile / Responsive Grids

| # | Defect | Acceptance Criterion |
|---|---|---|
| G-1 | "Add Labor" modal in `MyJobs.tsx` uses fixed `grid-cols-2` with no mobile breakpoint | Audit every modal/form grid app-wide; standardize on `grid-cols-1 sm:grid-cols-2` (or single-column where `sm` would still be cramped) |
| G-2 | `AppShell.tsx` uses `h-screen` on the root shell | Replace with `h-dvh` so mobile browser chrome does not clip content |
| G-3 | The above changes touch components also addressed by the mobile-redesign brief | Re-verify: no horizontal scroll, 40 px+ touch targets, sticky action bar in job detail, tables → cards below `md` |

### H · Design-System Fidelity

| # | Defect | Acceptance Criterion |
|---|---|---|
| H-1 | Raw color/spacing values exist alongside equivalent tokens | Replace every instance identified in Step 0-C with its token; eliminate dual representations |
| H-2 | Multiple status domains may share Badge variants across unrelated state machines | Confirm every status concept (job stage, training-session state, competency, certificate, stock, invoice) has its own distinct `Badge` variant; align with what `Badge.tsx` currently exports before adding or renaming |
| H-3 | Icon-only controls across the app may lack `aria-label` (partial pass already done in `AppShell.tsx`) | Extend the same standard to every remaining icon-only button (menu, notifications, close, logout, collapse-sidebar, and any others) |

### I · Data / Business-Rule Consistency

> Tackle only after A–H are stable. Only where no real backend is needed: derive figures instead of hardcoding, so the UI stays internally consistent.

| # | Defect | Acceptance Criterion |
|---|---|---|
| I-1 | Invoice totals are typed constants | Compute from the same job's logged labor and issued parts (labor + parts + VAT) |
| I-2 | Competency completion percentage counts all results | Count only signed passes; unsigned results show "Pending sign-off" and are excluded |
| I-3 | Purchasing "high value" / two-approval logic uses a hardcoded threshold | Drive from the threshold shown in Settings; require two distinct approvers |
| I-4 | Dashboard KPI numbers and alert counts may not reconcile with source data | Derive from Inventory, JobCards, Purchasing, and Training for the same active filters |

---

## What Not To Do

- **Do not redesign** screens not implicated by a defect above.
- **Do not introduce** new colors, illustrations, or layout patterns "for polish" — use the existing token system only.
- **Do not rename** routes, component props, or data fields unless a fix explicitly requires it.
- **Do not silence a feature to fix a bug** (e.g., do not remove the role picker instead of translating it).
- **Do not duplicate work** across sections — when a fix in one bucket touches a file also covered by another, make the change once and note it in both sections of the final report.

---

## Verification Checklist

Before declaring this pass complete, verify at **1440 px**, **1024 px**, and **390 px**, in both **English** and **Arabic**:

- [ ] No English text remains in the Arabic UI except identifiers and technical values
- [ ] No identifiers are reversed or visually corrupted in RTL context
- [ ] No horizontal overflow, clipped text, or overlapping elements at any breakpoint
- [ ] Desktop Sidebar and mobile drawer show identical items for the same role
- [ ] Every button that implies a state change actually changes state
- [ ] Language switch preserves page, tab, filters, form values, and any open modal
- [ ] All Arabic dates render Gregorian calendar with Latin digits
- [ ] RTL layout applies instantly on load (no flash) when Arabic is the stored preference
- [ ] `canAccess` default is permissive-failure-safe
- [ ] Every icon-only interactive element has an `aria-label`

---

## Final Report Format

```
## A · Navigation & Shell
- Fixed: ...
- Unresolved: ... (reason)

## B · Localization
...

## C · Auth
...

## D · Technician Workflow
...

## E · RBAC
...

## F · RTL Timing
...

## G · Mobile / Responsive
...

## H · Design-System Fidelity
...

## I · Data Consistency
...

## Additional findings from Step 0 (not listed above)
- [File / location]: [What was found] → [What was done]
```
