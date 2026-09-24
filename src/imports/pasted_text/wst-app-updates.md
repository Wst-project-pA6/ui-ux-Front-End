ROLE
You are modifying the EXISTING "WST — Workshop Management & Student Practical Training" web app (React + TypeScript + Tailwind + react-router + recharts). Do not rebuild it.

GLOBAL RULES (apply to every phase)
- Preserve all routes, existing features, data structures, design tokens and visual identity. Do not create duplicate pages or components; extend the existing ones (Button, Input, Select, Textarea, Badge, Card/KPICard, Modal, PageHeader, Table).
- Keep desktop layouts unchanged unless a phase says otherwise.
- Use logical Tailwind utilities (start/end, ms/me, ps/pe) instead of left/right.
- Every user-visible string goes through t(). English = LTR, Arabic = RTL.
- Identifiers (job numbers, PO numbers, SKUs, VINs, plates, amounts, phone numbers) always stay LTR and are never reversed.
- Language switching must never lose state: current page, tab, filters, form values, selected record.
- Work through the phases in order. After each phase, verify at 1440, 1024 and 390px in English and Arabic before moving on.

PHASE 1 — FUNCTIONAL BUGS
1. Inventory: give every <option> an explicit value; the "All" options use value="All", not translated text. Fix the status filter so "Out of Stock" maps to "out-of-stock" (use a value map, not string replace). Filters must work in both languages.
2. Input, Select, Textarea: forward `required` to the native element; add aria-invalid and aria-describedby for errors; give error text role="alert"; generate ids with React.useId instead of deriving them from labels.
3. Add real validation with localized messages: Login (valid email, non-empty password) and all required fields in every modal form.
4. Make every filter functional and controlled: Vehicles (make), Customers (city, status), Assessments (course, result), JobCards (priority, technician). Keep filter state across language switches. Make ID searches case-insensitive. Remove the fake pagination in Customers or make it real.
5. Dashboard alerts: the "Pending approval" alert (PO-2024-142) links to /purchasing?tab=approvals; the "Customer approval needed" alert (JC-2024-0905) links to /job-cards/JC-2024-0905.
6. Sidebar: replace the hardcoded "AM / Ahmed M. / Workshop Manager" with the active role from useRole() (initials, userName, userLabel).
7. AppShell: resolve page titles for parameterized routes such as /job-cards/:id. Build the desktop Sidebar and the mobile drawer from ONE shared nav config. Hide /design-system from the nav for non-manager roles. Move NavList out of the component body.
8. LanguageContext and RoleContext: validate values read from localStorage and fall back to defaults instead of crashing.
9. Modal: add role="dialog", aria-modal, aria-labelledby, Escape to close, focus trap and focus restore, an aria-label on the close button, and a scroll-lock counter so stacked modals do not unlock body scroll early.
10. Add aria-labels to every icon-only button (menu, notifications, close, logout).

PHASE 2 — ARABIC LOCALIZATION
1. Localize screens still in English: MyJobs, MyTraining, InvoicesReports, DesignSystem; the role picker in Login; role names and the "Role" header in Settings; role-specific page titles in AppShell and Sidebar; the modal titles "Job Card {id}" and "{name} — Competency Record"; the toast "dashboard-jobs.csv downloaded".
2. Localize data-driven content by storing structured data and rendering it through t(): AIInsights (title, prediction, reason, baseline, data availability, recommendation); training conflict messages (bay / mentor / capacity, with parameters); mentor notes; Reports chart labels (months, weeks, bay names, Pass / Needs Improvement / Fail); tooltips such as "Near capacity"; the "Priority" column header; utilization legends.
3. Extend t() to t(key, params) with interpolation and Arabic plural rules (zero, one, two, few, many, other). Replace every concatenated string like `${n} ${t('...')}` (vehicles.subtitle, inventory.results, customers.showing/of, dashboard.pipeline.total, jobCards.subtitle).
4. Wrap identifiers inside Arabic sentences with <bdi dir="ltr">.
5. Dates: in Arabic use the Gregorian calendar with Latin digits ('ar-SA-u-ca-gregory' or 'ar-EG'), and remove the forced dir="ltr" from the topbar date.
6. Fix the Arabic text of jobCards.detail.approvalWarning.desc: replace "الأعمال المحاسبة" with "الأعمال القابلة للفوترة".
7. Add an Arabic-capable font (IBM Plex Sans Arabic or Cairo) applied when lang is 'ar'; keep Inter for English.

PHASE 3 — TRUE RTL
1. Replace physical utilities with logical ones: `text-left` becomes `text-start` (Dashboard pipeline buttons and mobile job rows); left/right/ml/mr/pl/pr become start/end/ms/me/ps/pe. Position the mobile drawer with start/end and rtl: variants instead of a JS lang check.
2. Mirror directional icons in RTL: the logout icon, "→" in alert actions and "Open →", chevrons in pagination and breadcrumbs (rtl:-scale-x-100).
3. Reports (recharts) in RTL: XAxis reversed, YAxis orientation="right", swapped margins, legend and tooltip aligned to the direction.
4. Set document.documentElement.dir and lang before first paint (useLayoutEffect or an inline script) to remove the LTR flash.
5. Anchor toasts, dropdowns and the notification panel with start/end, not left/right.

PHASE 4 — BUSINESS RULES (keep the mock data, derive the values)
1. Invoices: compute labor total, parts total, VAT and invoice total from logged labor and issued parts in JobCards and InvoicesReports. Remove the hardcoded "SAR 500 / 165 / 665". Show labor, parts and invoice sections only after approval and work start.
2. Job cards: add a customerApproved field. Disable "Start Work" (with a visible reason) until approval is recorded. Add to the job detail: an approval section, a status timeline (user and timestamp per transition), an evidence/photos section and a work checklist.
3. Competencies: only signed passes count toward completion. Compute completionPct from the competency list. Unsigned results show "Pending sign-off" and never count toward certificate eligibility. Use a random verification token in the certificate URL instead of the sequential certificate number.
4. Assessments: an absent student's result is "Not assessed", not "Fail".
5. Purchasing: compute highValue from the threshold in Settings (SAR 5,000) and set requiredApprovals to 2 above it. The second approver must be a different user. Remove the hardcoded approver name. Fix the dangling goods receipt GR-2024-096 and set the PO status to "received" once a receipt is accepted.
6. Statuses: create separate badge variants for training sessions (scheduled, published, in progress, conflict, completed) and competency areas (not started, in progress, completed). Stop reusing Received / Ready / In Progress for them (Dashboard, Training, MyTraining).
7. Roles: give manager and advisor access to /invoices; split Mentor and Quality Checker consistently with Settings; let Technician create labor and part entries in the permission matrix; replace `delete` with `archive`; remove the `canAccess: () => true` fallback.
8. Make session IDs, dates and plates consistent across Training, Assessments, MyTraining, MyJobs and Vehicles, and make the AIInsights numbers agree with the training data.

PHASE 5 — MOBILE (360 / 390 / 430px; desktop unchanged)
1. Below md, render Training (courses, students), Assessments, Competencies, Purchasing (all tabs) and the JobCards labor/parts tables as stacked cards, following the existing Dashboard mobile card pattern. Use horizontal scroll only for the Settings permission matrix, inside overflow-x-auto.
2. Make every grid in modals and forms single-column on mobile (grid-cols-1 sm:grid-cols-2), including Vehicles, JobCards, Competencies, Inventory KPIs and Purchasing line items.
3. Wrap PageHeader actions and session card meta rows so they never overflow. Use h-dvh instead of h-screen on the shell.
4. Touch targets at least 40px. Add sticky bottom actions in the job detail modal.
5. No horizontal page scroll in either language.

PHASE 6 — DASHBOARD REDESIGN (this page only)
Desktop 1440 layout, top to bottom:
- Topbar: date, notifications, profile. Page header with Export.
- 4 KPI cards: Active jobs, Ready for delivery, Low stock items, Training today.
- Row: Job pipeline (2/3) beside Alerts and actions (1/3).
- Row: Recent jobs table (2/3) beside Utilization (1/3: technicians and bays).
- Upcoming training sessions (full width).
Changes:
- Add Bay utilization (bars per bay) under Technician utilization.
- Alerts: Low stock, Pending approvals, Training conflicts, and the new "Jobs needing attention". Each deep-links to the right page.
- KPI numbers and alert counts derive from the same data as Inventory, JobCards, Purchasing and Training so totals reconcile (Low stock items = low + out of stock).
- Training session status uses Scheduled / Published / Conflict badges.
- Tablet 1024: KPIs 2x2, sidebar collapsed to icons.
- Mobile 390: single column in this order: alerts, KPIs (compact rows), pipeline as scrollable status chips with a job list, recent jobs as cards, upcoming training, utilization.
- Add loading, empty and error states, localized, with RTL mirroring and LTR identifiers.

PHASE 7 — FINAL QA
Test English and Arabic at 1440, 1024 and 390. Fix what you find without redesigning: untranslated strings, reversed identifiers, horizontal overflow, clipped text, unmirrored icons, dead filters or buttons, missing validation, focus states, and state loss on language switch.

DEFINITION OF DONE
- No English text left in the Arabic UI except identifiers and technical values.
- No reversed IDs, VINs, SKUs or plates.
- No horizontal overflow, clipped text or overlapping elements at 360 / 390 / 430 / 1024 / 1440.
- All filters, forms and validation work in both languages.
- Invoice, dashboard and report totals are derived from source data and reconcile.
- The workflows are intact: Received → In Progress → Quality Check → Ready → Delivered, and Training → Attendance → Practical Task → Assessment → Supervisor Sign-off → Competency → Certificate.

At the end, output a short report: what was fixed per phase, and anything you could not fix.