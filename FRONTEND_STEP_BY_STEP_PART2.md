# WST — Frontend Step-by-Step (Part 2: Workshop, Job Workflow, Notifications, Attachments, Audit, Inventory)

Hi! This is the **second delivery**. It assumes you already did **Part 1** (sign-in, sessions,
"who am I", user administration) — this file does not repeat those steps. Do the steps **one by
one**. When a step says **"STOP"**, do what it says before continuing.

It is long because it covers a lot. You do **not** have to build everything at once — §21 suggests
an order.

---

## 0. What changed — Contract v3

- The contract file is now `wst-openapi-final.json` **version `3.0.0`**, title **"WST API — Final
  (v3)"**. The links from Part 1 did not change — the Final Swagger page updates itself.
- **New in this delivery (everything below is final):**
  - Workshop setup: customers, vehicles (+ service reminders), bays (+ bay calendar), service
    types, technician profiles, operating hours.
  - **The whole job card:** create/edit, assign bay + technician, stage workflow
    (Received → In Progress → Quality Check → Ready → Delivered), customer approvals, work items,
    labor, parts (reserve / issue / reverse), quality checks, stage history.
  - **Notifications** ("things waiting for me"), **attachments** (photos and evidence), the
    **audit log**, and **inventory** (parts catalog, stores, stock balances, stock movements, stock
    counts, stock adjustments).
- **Every operation documents its exact response body** in Swagger (click an operation →
  **Responses** → **Schema**). This file mirrors it with **real examples from the test server**.
- Still true from Part 1: **only build against `/api/docs-final`.** Purchasing, invoices, training,
  dashboards and exports are **not** final yet (§20).

---

## 1. What you received (folder `Part2`)

| Item | What it is |
|---|---|
| `wst-openapi-final.json` (v3) | **The contract.** Every finished endpoint, with exact request and response shapes. |
| `FRONTEND_API_GUIDE.md` | Short reference: errors, lists, formats, retries (updated for v3). |
| `WST_Demo_Accounts.md` | Demo emails **and passwords** — keep them out of code and Git. |
| This file | Step-by-step instructions for the new screens. |
| **Final Swagger page** | https://wst-backend-brg8e7dmawf0gne0.switzerlandnorth-01.azurewebsites.net/api/docs-final |
| **API base URL** | `https://wst-backend-brg8e7dmawf0gne0.switzerlandnorth-01.azurewebsites.net/api/v1` |

Re-generate your TypeScript types from the new file before you start (Part 1 §3 step 4):

```bash
npx openapi-typescript wst-openapi-final.json -o src/api/schema.ts
```

> ⚠️ The demo data was **re-created** for this delivery. IDs you may have saved from before are
> gone — always load IDs from the API, never hard-code them.

---

## 2. Recap: lists, errors, editing, money (see `FRONTEND_API_GUIDE.md`)

- Lists accept `page`/`pageSize` and return `{ items, page: { page, pageSize, totalItems, totalPages } }`.
- Errors always look like `{ "code", "message", "requestId", "details"? }`. Show `message`, branch
  on `code`, quote `requestId` when reporting a problem.
- A malformed request → **400 `BAD_REQUEST`**. A well-formed request that breaks a rule on a field →
  **422 `VALIDATION_FAILED`**, with each problem in `details[]` as `{ field, code, message }`.
  Something not allowed **in the record's current state** → **409** with a specific code.
- A record you edit may carry a `version` number. Send back the `version` you last read; if someone
  else changed it meanwhile you get **409 `VERSION_CONFLICT`** — reload and let the user retry.
- IDs are UUIDs. Timestamps are ISO-8601 UTC (`"2026-09-24T14:51:05.818Z"`).
- **Money** is `{ "amount": "150.0000", "currency": "EGP" }` — `amount` is a **string** with 4
  decimals. Never parse it as a float for arithmetic; display it formatted.
- A record outside what the caller may see answers **404**, as if it did not exist.
- **Fields that are absent:** optional fields are **left out** of the JSON when they have no value
  (they are not sent as `null`). Always write `job.bayId ?? "—"`, never assume a field exists.

---

## 3. Menu and buttons by permission

Add these to the permission-driven menu from Part 1 §8 (`GET /auth/me` → `permissions`). Hiding a
button is only for a nice UI — the server checks everything again.

| Menu item / button | Show if the user has |
|---|---|
| Customers (list/search/details) | `customers.read` |
| Create / edit customer | `customers.write` |
| Erase a customer's contact data | `customers.contact-erasure` |
| Vehicles (list/details/history/reminders) | `vehicles.read` |
| Create / edit vehicle, create/edit reminders | `vehicles.write` |
| Service types (list/details) | `service-types.read` or `service-types.manage` |
| Create/edit service types (incl. labor rate) | `service-types.manage` |
| Bays (list), bay calendar | `bays.read` |
| Create/edit bays | `bays.manage` |
| Technician profiles | `technician-profiles.read` or `technician-profiles.manage` |
| Create/edit technician profiles | `technician-profiles.manage` |
| Operating hours (view / edit) | `operating-hours.read` / `operating-hours.manage` |
| **Job cards** (list/details/work items/stage history/photos) | `jobs.read`, `jobs.read.assigned` or `jobs.read.quality-scope` |
| Create job card | `jobs.create` |
| Edit job card, add/cancel work items | `jobs.update` |
| Assign bay + technician | `jobs.assign` |
| "Start work" button | `jobs.transition.start` |
| "Send to quality check" button | `jobs.transition.submit-qc` |
| "Deliver to customer" button | `jobs.transition.deliver` |
| Customer approvals tab (read) | `approvals.read` |
| Record / decide / withdraw an approval | `approvals.record` |
| "Request additional work" (Technician) | `approvals.request` |
| Labor tab (read) / log + correct own labor | `labor.read` / `labor.write` |
| Mark a work item done | `labor.write` |
| Record a quality check | `quality.perform` |
| Upload a photo / evidence | `attachments.upload` |
| Attach photos to a job card | `attachments.upload.job-card` |
| Parts reservations tab | `inventory.reservations.read` or `inventory.issue` |
| Reserve / release / issue a part (Technician) | `inventory.issue` |
| Reverse a part issue | `inventory.reverse` |
| Parts catalog (read) / create + edit parts, stock levels | `parts.read` / `parts.write` |
| Stores, stock balances | `inventory.read` or `inventory.stock.read` |
| Stock movements, reconciliation | `inventory.read` |
| Stock counts (record + list) | `inventory.count` |
| Stock adjustments: list / create / approve-reject | `inventory.read`, `inventory.adjust` or `inventory.adjust.approve` / `inventory.adjust` / `inventory.adjust.approve` |
| Audit log | `audit.read` |
| 🔔 Notifications bell | **everyone** (no permission needed) |
| Show prices, labor rates and costs | only present in the response when the user has `inventory.cost.read` |

Roughly, by role: the **Service Advisor** runs customers, vehicles, job cards and customer approvals;
the **Workshop Manager** runs bays, service types, technician profiles, operating hours,
assignments, and approves stock adjustments; the **Technician** works on **their own assigned jobs**
(start, work items, labor, parts, request additional work, send to QC); the **Quality Checker**
records quality checks; the **Storekeeper** runs parts, stock levels, stock counts, adjustments and
reversals; the **Finance Viewer/Auditor** reads stock, adjustments and a finance subset of the audit
log; the **System Administrator** reads the full audit log.

---

## 4. Customers

### 4.1 Search / list — `GET /customers`
Query (all optional): `page`, `pageSize`, `sort` (`displayName`, `-displayName`, `createdAt`,
`-createdAt`), `q` (free-text search), `status` (`ACTIVE`/`ARCHIVED`), `phone`.

```json
{
  "items": [
    {
      "id": "a266c8e4-6d66-4423-8fed-15e81a3420b2",
      "organizationScopeId": "546a93da-d640-4a5c-b61d-30b9e36d559b",
      "displayName": "Ahmed Hassan",
      "type": "INDIVIDUAL",
      "phone": "+201000000001",
      "email": "ahmed.hassan@demo-customer.wst.local",
      "contactPreferences": { "preferredChannel": "PHONE", "preferredLocale": "en" },
      "status": "ACTIVE",
      "createdAt": "2026-09-24T14:51:05.818Z",
      "updatedAt": "2026-09-24T14:51:05.818Z",
      "createdBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8",
      "updatedBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 20, "totalPages": 1 }
}
```
`phone`, `email`, `contactPreferences`, `archivedAt`, `anonymizedAt`, `createdBy`, `updatedBy` all
appear **only when they have a value** — do not assume they exist.

### 4.2 Customer detail — `GET /customers/{customerId}`
Same shape as one list item. 404 → "Customer not found".

### 4.3 Create — `POST /customers` → **201**, returns the new customer
```json
{
  "organizationScopeId": "546a93da-d640-4a5c-b61d-30b9e36d559b",
  "displayName": "Ahmed Hassan",
  "type": "INDIVIDUAL",
  "phone": "+201000000001",
  "email": "ahmed.hassan@example.com",
  "contactPreferences": { "preferredChannel": "PHONE", "preferredLocale": "en" }
}
```
- `type`: `INDIVIDUAL` or `BUSINESS`.
- `phone`: international format, e.g. `+20...` (a leading `+`, country code, 7–15 digits total).
- `email`, `contactPreferences` are optional. `contactPreferences.preferredChannel`:
  `PHONE`/`SMS`/`EMAIL`; `preferredLocale`: `en`/`ar`.
- Errors: **404** if `organizationScopeId` is not a real, active unit the caller may use.

### 4.4 Edit (incl. corrections) — `PATCH /customers/{customerId}`
Send **only** the fields that change (at least one): `displayName`, `type` (yes — type is
correctable, e.g. fixing INDIVIDUAL → BUSINESS), `phone`, `email`, `contactPreferences`, `status`.

### 4.5 Archive / reactivate — same `PATCH`, with `status`
- `"ARCHIVED"`: fails with **409 `RESOURCE_IN_USE`** if the customer has any job card not yet
  `DELIVERED`. Show: "This customer has an open job — deliver or close it first."
- Back to `"ACTIVE"`: fails with **409 `INVALID_STATE_TRANSITION`** once the customer's contact
  data has been erased (§4.6) — an erased customer can never be reactivated. Show: "This
  customer's contact data has been erased and cannot be restored."

### 4.6 Contact erasure — `POST /customers/{customerId}/contact-erasure`
Only on an **already-archived** customer (else **409 `INVALID_STATE_TRANSITION`**). Body:
```json
{ "reason": "Customer requested erasure under data-protection policy (10+ characters)." }
```
`reason` is 10–500 characters and is **required** (it is recorded in the audit trail). On success
(200) the customer's `phone`/`email` disappear and `displayName` becomes a generic label like
`"Archived customer A266C8E4"` — tell the user this is **permanent**, with a confirm dialog before
calling it.

### 4.7 Errors specific to customers
| Status / code | Meaning |
|---|---|
| 404 `NOT_FOUND` | Customer (or `organizationScopeId` on create) not found / not in scope. |
| 400 `BAD_REQUEST` | Nothing to change on a PATCH, or an unknown `sort` value. |
| 409 `RESOURCE_IN_USE` | Tried to archive a customer with an open job. |
| 409 `INVALID_STATE_TRANSITION` | Tried to reactivate an erased customer, or erase a non-archived one. |

---

## 5. Vehicles

### 5.1 List — `GET /vehicles`
Query: `page`, `pageSize`, `sort` (`plate`, `make`, `createdAt`, each `-` for descending), `q`,
`customerId`, `plate`, `vin`, `make`, `model`, `status`.
```json
{
  "items": [
    {
      "id": "03878534-72d3-4a34-a739-7205ca8003ce",
      "customerId": "a266c8e4-6d66-4423-8fed-15e81a3420b2",
      "plate": "DEMO-001", "vin": "WST00000000000001",
      "make": "Toyota", "model": "Corolla", "year": 2021,
      "mileage": 42000, "mileageUnit": "KM", "status": "ACTIVE",
      "createdAt": "2026-09-24T14:51:05.870Z", "updatedAt": "2026-09-24T14:51:05.870Z",
      "createdBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8", "updatedBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 }
}
```

### 5.2 Create — `POST /vehicles` → **201**
```json
{
  "customerId": "a266c8e4-6d66-4423-8fed-15e81a3420b2",
  "plate": "DEMO-001", "vin": "WST00000000000001",
  "make": "Toyota", "model": "Corolla", "year": 2021,
  "mileage": 42000, "mileageUnit": "KM"
}
```
`vin` must be exactly 17 characters (letters/digits, no `I`/`O`/`Q`). `year` 1950–2100. `mileage`
≥ 0, whole number. 404 if `customerId` is not a customer the caller may use. **409
`DUPLICATE_RESOURCE`** if the plate or VIN is already used by another **active** vehicle.

### 5.3 Vehicle detail — `GET /vehicles/{vehicleId}`
Same fields as a list item, **plus** `serviceHistory` (every delivered job for this vehicle) and,
when one is due, `nextService`:
```json
{
  "id": "03878534-72d3-4a34-a739-7205ca8003ce",
  "customerId": "a266c8e4-6d66-4423-8fed-15e81a3420b2",
  "plate": "DEMO-001", "vin": "WST00000000000001",
  "make": "Toyota", "model": "Corolla", "year": 2021,
  "mileage": 42000, "mileageUnit": "KM", "status": "ACTIVE",
  "createdAt": "2026-09-24T14:51:05.870Z", "updatedAt": "2026-09-24T14:51:05.870Z",
  "createdBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8", "updatedBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8",
  "serviceHistory": [
    {
      "jobId": "accb11c5-50c3-4eff-8bf7-62851b63afdd",
      "jobNumber": "JC-2026-000001",
      "serviceType": "REPAIR", "serviceTypeName": "Repair",
      "complaint": "Customer reports a squeaking noise from the front brakes when stopping.",
      "mileageAtIntake": 42150,
      "deliveredAt": "2026-09-24T14:58:11.541Z"
    }
  ],
  "nextService": { "dueMileage": 47000, "reminderId": "0f118487-ce52-44a7-8742-4206dc5ce274" }
}
```
`nextService` has `dueDate` and/or `dueMileage` (whichever the earliest open reminder set) plus
`reminderId` — and is **absent entirely** when there is no open reminder. `serviceHistory` is
`[]` for a vehicle with no delivered jobs yet.

### 5.4 Edit (incl. corrections) — `PATCH /vehicles/{vehicleId}`
Fields: `plate`, `vin`, `make`, `model`, `year`, `mileage`, `status`. Same duplicate/format rules
as create.
- **`mileage` may only increase.** Sending a lower value → **422 `VALIDATION_FAILED`** with
  `details: [{ "field": "/mileage", "code": "MILEAGE_LOWER_THAN_RECORDED", ... }]`.

### 5.5 Archive — `PATCH` with `status: "ARCHIVED"`
Same rule as customers: **409 `RESOURCE_IN_USE`** if the vehicle has a job that is not yet
`DELIVERED`. An archived vehicle also cannot receive a **new** job card (§10.1).

### 5.6 Service history — `GET /vehicles/{vehicleId}/service-history`
Paginated version of the `serviceHistory` array above (`page`, `pageSize`, `sort`: `deliveredAt`).

### 5.7 Service reminders
**List — `GET /vehicles/{vehicleId}/reminders`** (query: `page`, `pageSize`, `status`:
`OPEN`/`DONE`/`CANCELLED`):
```json
{
  "items": [
    {
      "id": "0f118487-ce52-44a7-8742-4206dc5ce274",
      "vehicleId": "03878534-72d3-4a34-a739-7205ca8003ce",
      "title": "Next oil change due",
      "dueMileage": 47000,
      "status": "OPEN",
      "createdAt": "2026-09-24T15:11:59.838Z", "updatedAt": "2026-09-24T15:11:59.838Z",
      "createdBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8", "updatedBy": "0015c93a-3139-46a1-8777-5dc8a8718bc8"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 2, "totalPages": 1 }
}
```
`dueDate` (date-only, `"YYYY-MM-DD"`), `dueMileage`, `completedAt`, `notes` all appear only when set.

**Create — `POST /vehicles/{vehicleId}/reminders`** → 201:
```json
{ "title": "Next oil change due", "dueMileage": 47000 }
```
At least one of `dueDate` (`"YYYY-MM-DD"`) or `dueMileage` is required — neither → **422
`VALIDATION_FAILED`** (`REMINDER_TRIGGER_REQUIRED`). `notes` optional, max 500 chars.

**Edit — `PATCH /service-reminders/{reminderId}`** (note: **not** nested under `/vehicles/...`):
fields `title`, `dueDate`, `dueMileage`, `notes`, and `status` — but `status` here only accepts
`"DONE"` or `"CANCELLED"` (you close a reminder, you don't reopen one). Once a reminder has left
`OPEN`, changing `status` again → **409 `INVALID_STATE_TRANSITION`**.

### 5.8 Errors specific to vehicles
| Status / code | Meaning |
|---|---|
| 404 `NOT_FOUND` | Vehicle/customer/reminder not found or not in scope. |
| 409 `DUPLICATE_RESOURCE` | Plate or VIN already used by another active vehicle. |
| 422 `MILEAGE_LOWER_THAN_RECORDED` | New mileage is below what is on file. |
| 409 `RESOURCE_IN_USE` | Tried to archive a vehicle with an open job. |
| 422 `REMINDER_TRIGGER_REQUIRED` | Reminder has neither `dueDate` nor `dueMileage`. |
| 409 `INVALID_STATE_TRANSITION` | Tried to change the status of a reminder that already left OPEN. |

---

## 6. Service types

### 6.1 List — `GET /service-types` and detail — `GET /service-types/{serviceTypeId}`
⚠️ **The Service Advisor sees no rate.** The response shape differs by permission:

**As Service Advisor** (`service-types.read` only):
```json
{ "id": "d3869b5e-45a3-4ae8-8021-d3604c078486", "code": "DIAGNOSTIC", "name": "Diagnostic", "status": "ACTIVE" }
```
**As Workshop Manager** (`service-types.manage`) — same record, more fields:
```json
{
  "id": "d3869b5e-45a3-4ae8-8021-d3604c078486", "code": "DIAGNOSTIC", "name": "Diagnostic",
  "laborHourlyRate": "150.0000", "status": "ACTIVE", "version": 1,
  "createdAt": "2026-09-24T20:58:46.773Z", "updatedAt": "2026-09-24T20:58:46.773Z"
}
```
`laborHourlyRate` is a **string** (4 decimals), like every money amount. Never render or send it
as a number. Build your "Service type" picker (used later on the job-card form, §10.1) from
whichever shape the caller gets — do not assume `laborHourlyRate` exists.

### 6.2 Create — `POST /service-types` (Workshop Manager only) → 201
```json
{ "code": "REPAIR", "name": "Repair", "laborHourlyRate": 150 }
```
`code`: 1–20 chars, uppercase letters/digits/`_`/`-` only. `laborHourlyRate` ≥ 0 (sent as a JSON
number on create; comes back as a string, see above). 409 `DUPLICATE_RESOURCE` if the code exists.

### 6.3 Edit — `PATCH /service-types/{serviceTypeId}` (Workshop Manager only)
**Requires `version`** (optimistic concurrency — read it first, send it back):
```json
{ "version": 1, "laborHourlyRate": 175, "status": "ACTIVE" }
```
Fields: `name`, `laborHourlyRate`, `status` (`ACTIVE`/`INACTIVE`) — at least one besides `version`.
Stale `version` → **409 `VERSION_CONFLICT`**.

---

## 7. Bays + bay calendar

### 7.1 List — `GET /bays` (Workshop Manager, Training Supervisor)
Query: `page`, `pageSize`, `sort` (`code`, `name`, each with optional `-`), `status`
(`ACTIVE`/`MAINTENANCE`/`INACTIVE`).
```json
{
  "items": [
    {
      "id": "02dee393-0a2f-41f2-a4e7-381fd7f21532",
      "organizationScopeId": "546a93da-d640-4a5c-b61d-30b9e36d559b",
      "code": "DEMO-BAY-01", "name": "Bay 1 - General Service", "capacity": 1, "status": "ACTIVE",
      "createdAt": "2026-09-24T14:51:05.948Z", "updatedAt": "2026-09-24T14:51:05.948Z",
      "createdBy": "256a43c7-ee44-4353-8147-5c4b74356a82", "updatedBy": "256a43c7-ee44-4353-8147-5c4b74356a82"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 4, "totalPages": 1 }
}
```

### 7.2 Create/Edit — Workshop Manager only
`POST /bays` → 201: `{ "organizationScopeId", "code", "name", "capacity" }` (`code` 1–20 chars,
409 `DUPLICATE_RESOURCE` if reused). `PATCH /bays/{bayId}`: `name`/`capacity`/`status`
(`ACTIVE`/`MAINTENANCE`/`INACTIVE`) — no `version`, plain last-write-wins.

### 7.3 Bay calendar — `GET /bays/{bayId}/calendar`
Query **required**: `from`, `to` — ISO datetimes **ending in `Z`**, `to` after `from`, window
**at most 31 days** (else 400 `BAD_REQUEST`).
```json
{ "bayId": "02dee393-0a2f-41f2-a4e7-381fd7f21532", "from": "2026-09-21T21:36:05.745Z", "to": "2026-09-27T21:36:05.745Z", "entries": [] }
```
A busy bay looks like:
```json
{
  "kind": "JOB",
  "referenceId": "41e40a11-a68f-441a-9506-c494e5592cbb",
  "referenceLabel": "JC-2026-000004",
  "startsAt": "2026-09-24T14:56:06.430Z",
  "endsAt": "2026-09-25T14:51:06.430Z"
}
```
`kind` is `"JOB"` or `"TRAINING_SESSION"` — a training session entry additionally carries
`courseName` and `mentorName` (never any student data). **`referenceId` is absent** on a `"JOB"`
entry when the caller cannot read jobs (the Training Supervisor, who still sees the calendar under
D18's exception) — show the time window and `referenceLabel` only in that case, no link-through.

---

## 8. Technician profiles (Workshop Manager only)

A **technician profile** is the record that makes an account **assignable to a job** — separate
from the `TECHNICIAN` user account itself (Part 1's user administration).

### 8.1 List / detail — `GET /technician-profiles`, `GET /technician-profiles/{id}`
```json
{
  "id": "1b6e3952-13ba-4be1-b7dd-77a83b9b692e",
  "displayName": "Amr Shawky",
  "userId": "abdb1757-9e8e-422c-9dba-cad7b0caf3e9",
  "status": "ACTIVE", "version": 1,
  "createdAt": "2026-09-24T21:00:44.480Z", "updatedAt": "2026-09-24T21:00:44.480Z",
  "createdBy": "256a43c7-ee44-4353-8147-5c4b74356a82", "updatedBy": "256a43c7-ee44-4353-8147-5c4b74356a82"
}
```
`userId` is **absent** for a profile not yet linked to a login account.

### 8.2 Create — `POST /technician-profiles` → 201
```json
{ "displayName": "Amr Shawky", "userId": "abdb1757-9e8e-422c-9dba-cad7b0caf3e9" }
```
`userId` is optional but, if sent, must be an **ACTIVE** account holding the `TECHNICIAN` role —
else **422 `ACCOUNT_NOT_ELIGIBLE`**. One account can have only one profile (409
`DUPLICATE_RESOURCE`).

### 8.3 Edit — `PATCH /technician-profiles/{id}` — **requires `version`**
```json
{ "version": 1, "userId": null }
```
Send `userId: null` to **unlink** the account from the profile (the profile itself is not
deleted). `displayName`, `status` (`ACTIVE`/`INACTIVE`) also editable. Stale `version` → 409
`VERSION_CONFLICT`.

---

## 9. Operating hours (Workshop Manager only, single workshop-wide record)

### 9.1 Read — `GET /config/operating-hours`
```json
{
  "organizationScopeId": "546a93da-d640-4a5c-b61d-30b9e36d559b",
  "version": 1,
  "days": [
    { "weekday": 0, "isClosed": false, "opensAt": "08:00:00", "closesAt": "18:00:00" },
    { "weekday": 1, "isClosed": false, "opensAt": "08:00:00", "closesAt": "18:00:00" },
    { "weekday": 2, "isClosed": false, "opensAt": "08:00:00", "closesAt": "18:00:00" },
    { "weekday": 3, "isClosed": false, "opensAt": "08:00:00", "closesAt": "18:00:00" },
    { "weekday": 4, "isClosed": false, "opensAt": "08:00:00", "closesAt": "18:00:00" },
    { "weekday": 5, "isClosed": false, "opensAt": "08:00:00", "closesAt": "18:00:00" },
    { "weekday": 6, "isClosed": false, "opensAt": "08:00:00", "closesAt": "18:00:00" }
  ],
  "updatedAt": "2026-09-24T20:58:46.773Z",
  "updatedBy": null
}
```
`weekday`: `0` = Sunday … `6` = Saturday. `updatedBy` can genuinely be `null` (installation data
that has never been edited by a person). ⚠️ **`opensAt`/`closesAt` come back as `"HH:MM:SS"`**
(seconds included) even though you **send** them as `"HH:MM"` on write (§9.2) — format them for
display, don't string-compare the two.

### 9.2 Replace — `PUT /config/operating-hours` — **requires `version`**, replaces **all 7 days**
```json
{
  "version": 1,
  "days": [
    { "weekday": 0, "isClosed": false, "opensAt": "08:00", "closesAt": "18:00" },
    { "weekday": 1, "isClosed": false, "opensAt": "08:00", "closesAt": "18:00" },
    { "weekday": 2, "isClosed": false, "opensAt": "08:00", "closesAt": "18:00" },
    { "weekday": 3, "isClosed": false, "opensAt": "08:00", "closesAt": "18:00" },
    { "weekday": 4, "isClosed": false, "opensAt": "08:00", "closesAt": "18:00" },
    { "weekday": 5, "isClosed": false, "opensAt": "08:00", "closesAt": "18:00" },
    { "weekday": 6, "isClosed": true }
  ]
}
```
All **7 weekdays** must be present, each **exactly once** (422 `MISSING_WEEKDAY` /
`DUPLICATE_WEEKDAY`). A day with `isClosed: true` needs no times; otherwise `opensAt` and
`closesAt` are both required and `closesAt` must be after `opensAt` (422 `WINDOW_REQUIRED` /
`WINDOW_INVALID`). Returns the full record (§9.1 shape). Stale `version` → 409 `VERSION_CONFLICT`.

---

## 10. Job cards

### 10.0 The big picture — read this first

A job card moves through **five stages**, always in this order:

```
RECEIVED ──► IN_PROGRESS ──► QUALITY_CHECK ──► READY ──► DELIVERED
                  ▲                │
                  └── QC failed ◄──┘
```

| Step | Who | How |
|---|---|---|
| Open the job | Service Advisor | `POST /job-cards` (§10.1) → stage **RECEIVED** |
| Record the customer's approval of the initial work | Service Advisor | §12 (approvals) |
| Assign bay + technician | Workshop Manager | `PUT /job-cards/{id}/assignment` (§10.6) |
| **Start work** | the assigned Technician | transition → **IN_PROGRESS** (§11) — needs the assignment **and** an approved initial scope |
| Log labor, reserve/issue parts, mark work items done | the assigned Technician | §13, §14, §15 |
| Extra work found? | Technician requests → Service Advisor records the customer's decision → adds the work item | §12.4 |
| **Send to quality check** | the assigned Technician | transition → **QUALITY_CHECK** (§11) — every work item must be DONE or CANCELLED |
| Record the quality check | Quality Checker | §16 — **PASSED moves the job to READY** by itself (and drafts the invoice); **FAILED sends it back to IN_PROGRESS** |
| **Deliver** | Service Advisor | transition → **DELIVERED** (§11) — needs a **finalized** invoice (invoicing arrives in a later delivery) |

Special case: if the customer **declines** (or withdraws) the initial scope while the job is still
RECEIVED and nothing was logged, the job is **closed automatically**: RECEIVED → DELIVERED, no
invoice, "vehicle returned without work" (§12.3).

There is no "cancelled" stage — the source requirements define exactly these five.

### 10.1 Create — `POST /job-cards` → 201 (Service Advisor)
```json
{
  "vehicleId": "03878534-72d3-4a34-a739-7205ca8003ce",
  "complaint": "Customer reports a squeaking noise from the front brakes when stopping.",
  "serviceTypeId": "7be82937-f4d6-4303-a5ec-e00714709804",
  "priority": "NORMAL",
  "mileageAtIntake": 42150,
  "expectedCompletionAt": "2026-09-26T14:51:06.453Z",
  "workItems": [
    { "description": "Inspect front brake pads and rotors" },
    { "description": "Replace front brake pads" }
  ],
  "attachmentIds": ["<ids of JOB_PHOTO uploads, see §18>"]
}
```
- `serviceTypeId`: pick from `GET /service-types` (§6) — must be **ACTIVE**, else 422
  `SERVICE_TYPE_NOT_ACTIVE`.
- `priority`: exactly **`LOW`**, **`NORMAL`** or **`HIGH`** — a 3-option control.
- `mileageAtIntake` must be ≥ the vehicle's recorded mileage, else 422 `MILEAGE_LOWER_THAN_RECORDED`.
- The vehicle must be `ACTIVE` (not archived), else 422 `VEHICLE_ARCHIVED`.
- `expectedCompletionAt`: ISO datetime ending in `Z`.
- `workItems` (optional, up to 50): the **initial work checklist** — each item is only
  `{ "description" }` (1–300 chars). ⚠️ `isAdditionalWork` **no longer exists** (changed since v2).
- `attachmentIds` (optional, up to 10): intake photos you uploaded first (§18).

The response is a full job card (§10.3 shape). It does **not** echo `workItems` — call §10.5.

### 10.2 List / filter — `GET /job-cards`
Query: `page`, `pageSize`, `sort` (`jobNumber`, `createdAt`, `expectedCompletionAt`, `priority`,
each with optional `-`), `q`, `from`/`to` (ISO datetimes ending in `Z` — filter on
`expectedCompletionAt`, `from` inclusive/`to` exclusive), `stage`
(`RECEIVED`/`IN_PROGRESS`/`QUALITY_CHECK`/`READY`/`DELIVERED`), `priority`, `jobNumber`,
`technicianId`, `bayId`, `vehicleId`, `customerId`.

**Row scope by role** (server-enforced — build your screen around it): a **Technician** sees only
jobs assigned to them; a **Quality Checker** sees only jobs **currently in QUALITY_CHECK**; the
**Service Advisor** and **Workshop Manager** see every job in their unit.

Each item has the §10.3 shape. `bayId`, `technicianId`, `scheduledStartAt`, `deliveredAt` appear
only once set. `approvalSummary` is **always present**:
- `billableWorkAllowed` — the initial scope is approved, so work may start/be logged;
- `approvedScopes` — which scopes are approved so far (`INITIAL_WORK`, `ADDITIONAL_WORK`);
- `pendingApprovalCount` — decisions still outstanding (show a badge like "1 approval pending").

A job that is `DELIVERED` with `billableWorkAllowed: false` is a **declined / withdrawn** job
(closed without work) — show it differently (e.g. "Returned without work").

### 10.3 Detail — `GET /job-cards/{jobId}`
```json
{
  "id": "7e6925c6-b582-45e8-9d2c-a636cbb1bb9f", "jobNumber": "JC-2026-000004",
  "customerId": "…", "customerDisplayName": "Cairo Logistics LLC",
  "vehicleId": "…", "vehiclePlate": "DEMO-004",
  "organizationScopeId": "…",
  "complaint": "Fleet vehicle: air conditioning compressor is not engaging.",
  "serviceTypeId": "…", "serviceTypeCode": "REPAIR", "serviceTypeName": "Repair",
  "priority": "HIGH", "mileageAtIntake": 91250,
  "stage": "DELIVERED", "stageChangedAt": "2026-09-25T06:07:23.155Z",
  "bayId": "…", "technicianId": "…",
  "scheduledStartAt": "2026-09-25T06:12:02.774Z",
  "expectedCompletionAt": "2026-09-26T06:07:02.774Z",
  "deliveredAt": "2026-09-25T06:07:23.155Z",
  "approvalSummary": { "billableWorkAllowed": true, "approvedScopes": ["ADDITIONAL_WORK", "INITIAL_WORK"], "pendingApprovalCount": 0 },
  "version": 7,
  "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
}
```
`version` climbs with every edit, assignment and stage change — read it fresh before §10.4/§10.6.

### 10.4 Edit — `PATCH /job-cards/{jobId}` — **requires `version`** (Service Advisor)
```json
{ "version": 1, "priority": "HIGH", "expectedCompletionAt": "2026-09-27T10:00:00.000Z" }
```
Fields: `complaint`, `priority`, `serviceTypeId`, `expectedCompletionAt` — at least one besides
`version`. A **DELIVERED** job can no longer be edited → 409 `JOB_STAGE_NOT_ALLOWED`. If the job
has a scheduled start, `expectedCompletionAt` must stay after it → 422 `INVALID_TIME_WINDOW`. Stale
`version` → 409 `VERSION_CONFLICT`.

### 10.5 Work items
**List — `GET /job-cards/{jobId}/work-items`** (query: `page`, `pageSize`, `status`:
`PENDING`/`DONE`/`CANCELLED`):
```json
{
  "items": [
    {
      "id": "998fdff3-a9bc-487d-9575-cde842cc7f22", "jobId": "7e6925c6-…",
      "description": "Diagnose AC compressor fault",
      "status": "DONE", "isAdditionalWork": false,
      "completedAt": "2026-09-25T06:07:08.965Z",
      "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
    },
    {
      "id": "0516a1b9-24ff-4afe-94c3-c611bdb67d3d", "jobId": "7e6925c6-…",
      "description": "Spark plugs found worn during inspection; customer approved replacement.",
      "status": "DONE", "isAdditionalWork": true,
      "approvalId": "af3ba795-225c-498b-bf9b-0c547fa8720f",
      "completedAt": "2026-09-25T06:07:15.188Z",
      "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 }
}
```
`isAdditionalWork: true` + `approvalId` = extra work the customer approved later (§12.4).

**Add — `POST /job-cards/{jobId}/work-items`** → 201 (Service Advisor) — ⚠️ **changed since v2:**
```json
{ "description": "Replace worn spark plugs", "approvalId": "af3ba795-225c-498b-bf9b-0c547fa8720f" }
```
After a job is opened, a new work item can **only** come from **customer-approved additional
work**. So:
- `approvalId` is **required**: an **APPROVED** `ADDITIONAL_WORK` approval on the **same** job that
  has **not** been used for a work item yet (one approval → one work item). Otherwise **422
  `APPROVAL_NOT_USABLE`**.
- The job must be **IN_PROGRESS**, else **409 `JOB_STAGE_NOT_ALLOWED`**.
- Build this as a button on an approved additional-work approval ("Add as work item"), not as a
  free form.

**Update — `PATCH /job-cards/{jobId}/work-items/{workItemId}`** (see §13).

### 10.6 Assign bay + technician — `PUT /job-cards/{jobId}/assignment` (Workshop Manager)
**Requires `version`.** Also sets the schedule:
```json
{
  "version": 1,
  "bayId": "02dee393-0a2f-41f2-a4e7-381fd7f21532",
  "technicianId": "abdb1757-9e8e-422c-9dba-cad7b0caf3e9",
  "scheduledStartAt": "2026-09-25T08:00:00.000Z",
  "expectedCompletionAt": "2026-09-25T17:00:00.000Z"
}
```
- Build the **bay** picker from `GET /bays` (§7.1) and the **technician** picker from
  `GET /technicians` (below) — **not** `GET /technician-profiles`; only technicians who are
  ACTIVE, hold an ACTIVE profile, and are in the job's unit are assignable.
- `scheduledStartAt` must be before `expectedCompletionAt` → else 422 `INVALID_TIME_WINDOW`.
- A **DELIVERED** job cannot be reassigned → 409 `JOB_STAGE_NOT_ALLOWED`.
- Assignment is allowed while the initial approval is still pending — only **starting** needs it.
- The newly assigned Technician gets a **notification** (§17).
- Returns the updated job card (§10.3 shape).

**`GET /technicians`** (query: `page`, `pageSize`, `q`, `sort: displayName`) — the picker source:
```json
{
  "items": [
    { "id": "abdb1757-9e8e-422c-9dba-cad7b0caf3e9", "displayName": "Amr Shawky", "technicianProfileId": "1b6e3952-13ba-4be1-b7dd-77a83b9b692e" }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 5, "totalPages": 1 }
}
```

#### The `SCHEDULE_CONFLICT` response (409) — read carefully
If the chosen bay/technician/time window collides with something else, assignment fails **409**
with `code: "SCHEDULE_CONFLICT"` and a **`conflicts`** array alongside the usual error fields:
```json
{
  "code": "SCHEDULE_CONFLICT",
  "message": "Scheduling conflict",
  "requestId": "…",
  "conflicts": [
    {
      "conflictKey": "BAY_JOB_CONFLICT-3a1c...",
      "kind": "BAY_JOB_CONFLICT",
      "overridable": true,
      "overridden": false,
      "message": "BAY JOB CONFLICT conflicts with JC-2026-000004",
      "bayId": "7ae53938-026e-47f2-9fc5-3f2ba2b82096",
      "conflictingReference": {
        "kind": "JOB",
        "referenceId": "41e40a11-a68f-441a-9506-c494e5592cbb",
        "referenceLabel": "JC-2026-000004",
        "startsAt": "2026-09-24T14:56:06.430Z",
        "endsAt": "2026-09-25T14:51:06.430Z"
      }
    }
  ]
}
```
- `kind`: `BAY_JOB_CONFLICT` / `BAY_SESSION_CONFLICT` (the bay is already booked — by a job or a
  training session) / `MENTOR_SESSION_CONFLICT` (the chosen person is already booked as a mentor at
  that time) / `BAY_UNAVAILABLE` (the bay itself is `MAINTENANCE`/`INACTIVE` — no
  `conflictingReference`).
- **Only `BAY_JOB_CONFLICT` / `BAY_SESSION_CONFLICT` are ever overridable.** A
  `MENTOR_SESSION_CONFLICT` or `BAY_UNAVAILABLE` is **never** overridable — show the conflict and
  make the user pick a different bay/time.
- **To override** a `BAY_*` conflict, resend the **same** request with an added `overrideReason`
  (10–500 characters) — the caller needs `schedule.override-conflict` (Workshop Manager). Show the
  override control only when **every** listed conflict has `overridable: true`.

### 10.7 Errors specific to job cards
| Status / code | Meaning |
|---|---|
| 404 `NOT_FOUND` | Job / vehicle / bay / technician / approval not found or not in scope. |
| 422 `VEHICLE_ARCHIVED` | Chosen vehicle is archived — cannot receive a new job. |
| 422 `MILEAGE_LOWER_THAN_RECORDED` | Intake mileage below the vehicle's recorded mileage. |
| 422 `SERVICE_TYPE_NOT_ACTIVE` | `serviceTypeId` does not exist or is INACTIVE. |
| 422 `TECHNICIAN_NOT_ELIGIBLE` | Chosen technician is not ACTIVE/eligible/in scope. |
| 422 `INVALID_TIME_WINDOW` | `expectedCompletionAt` not after `scheduledStartAt` (or the job's start). |
| 422 `APPROVAL_NOT_USABLE` | New work item's `approvalId` is not an unused, APPROVED additional-work approval of this job. |
| 409 `JOB_STAGE_NOT_ALLOWED` | Edit/reassign a DELIVERED job, or add a work item when the job is not IN_PROGRESS. |
| 409 `VERSION_CONFLICT` | Someone else changed the job first — reload and retry. |
| 409 `SCHEDULE_CONFLICT` | See §10.6 — inspect `conflicts[]`. |
| 409 `ATTACHMENT_NOT_LINKABLE` | An `attachmentIds` entry is not your own fresh, unlinked JOB_PHOTO upload (§18). |
| 400 `BAD_REQUEST` | Unknown `sort` value, or `from`/`to` out of order on list. |

---

## 11. Moving a job forward — `POST /job-cards/{jobId}/transitions` → 200

One endpoint for the three **manual** stage changes. Send the stage you are moving **to** and the
stage you **see now**:

```json
{ "toStage": "IN_PROGRESS", "expectedFromStage": "RECEIVED" }
```

| Button | `expectedFromStage` → `toStage` | Who | The server checks |
|---|---|---|---|
| **Start work** | `RECEIVED` → `IN_PROGRESS` | the **assigned** Technician | a bay + technician are assigned (else 409 `JOB_ASSIGNMENT_REQUIRED`); the initial scope is approved (else 409 `CUSTOMER_APPROVAL_REQUIRED`) |
| **Send to quality check** | `IN_PROGRESS` → `QUALITY_CHECK` | the **assigned** Technician | every work item is `DONE` or `CANCELLED` (else 409 `CHECKLIST_INCOMPLETE`) |
| **Deliver to customer** | `READY` → `DELIVERED` | Service Advisor | the job's invoice is **finalized** (issued or paid) — else 409 `INVOICE_REQUIRED` |

- `reason` (optional, 3–500 chars) is stored on the stage-history entry.
- The response is the updated job card (§10.3).
- **QUALITY_CHECK → READY and QUALITY_CHECK → IN_PROGRESS are not buttons here** — they happen
  automatically when the Quality Checker records the result (§16). Sending them here → 409
  `INVALID_STATE_TRANSITION`.
- Any other pair (skipping a stage, going backwards) → 409 `INVALID_STATE_TRANSITION`.
- If `expectedFromStage` is not the job's current stage (someone else moved it) → **409
  `VERSION_CONFLICT`** → reload the job.
- A Technician calling this on a job **not assigned to them** → 404.
- ⚠️ **Deliver:** invoices are **not in this delivery** (they come in Part 3). Until then, **Deliver**
  on a READY job answers **409 `INVOICE_REQUIRED`** unless the invoice was already finalized in the
  demo data. Build the button now; show the message "The invoice must be issued before delivery."
- When the job enters Quality Check, the Quality Checkers are notified; when it becomes Ready, the
  Service Advisors are notified (§17).
- When a job is delivered, any part reservations still active on it are **released automatically**.

### 11.1 Stage history — `GET /job-cards/{jobId}/stage-history`
Also readable by the Finance Viewer/Auditor. Oldest first:
```json
{
  "items": [
    { "id": "c8f17e85-…", "jobId": "7e6925c6-…", "toStage": "RECEIVED", "transitionedBy": "87d6b082-…", "transitionedAt": "2026-09-25T06:06:58.854Z" },
    { "id": "03bf92ba-…", "jobId": "7e6925c6-…", "fromStage": "RECEIVED", "toStage": "IN_PROGRESS", "transitionedBy": "bedac36e-…", "transitionedAt": "2026-09-25T06:07:04.654Z" },
    { "id": "c99fd1d2-…", "jobId": "7e6925c6-…", "fromStage": "IN_PROGRESS", "toStage": "QUALITY_CHECK", "transitionedBy": "bedac36e-…", "transitionedAt": "2026-09-25T06:07:16.174Z" },
    { "id": "3af06bb0-…", "jobId": "7e6925c6-…", "fromStage": "QUALITY_CHECK", "toStage": "READY", "transitionedBy": "9474e97b-…", "transitionedAt": "2026-09-25T06:07:19.214Z" },
    { "id": "95721ed1-…", "jobId": "7e6925c6-…", "fromStage": "READY", "toStage": "DELIVERED", "transitionedBy": "87d6b082-…", "transitionedAt": "2026-09-25T06:07:23.155Z" }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 5, "totalPages": 1 }
}
```
The first entry has no `fromStage`. `reason` appears when one was given — e.g. a declined job
(JC-2026-000006) shows `"fromStage": "RECEIVED", "toStage": "DELIVERED", "reason": "Initial scope
declined: Customer declined the quote; vehicle returned without work."` Show it as a timeline.

---

## 12. Customer approvals

Customers have no login — the **Service Advisor records** what the customer decided. There are two
scopes you will use: **`INITIAL_WORK`** (the quoted job) and **`ADDITIONAL_WORK`** (extra work found
during the job). A third value `SUBLET` exists in the contract but is **not used yet** — do not offer
it in the UI.

### 12.1 List — `GET /job-cards/{jobId}/approvals`
Query: `page`, `pageSize`, `status` (`PENDING`/`APPROVED`/`REJECTED`/`WITHDRAWN`), `scope`.
```json
{
  "items": [
    {
      "id": "a4d12367-bfa1-4c92-9f1a-e36362abdf76",
      "jobId": "7e6925c6-b582-45e8-9d2c-a636cbb1bb9f",
      "scope": "INITIAL_WORK",
      "description": "Customer approved the initial diagnosis and quoted work over the phone.",
      "estimatedAmount": { "amount": "1200.0000", "currency": "EGP" },
      "workItemIds": [],
      "status": "APPROVED",
      "method": "PHONE",
      "approvedByName": "Customer (phone confirmation)",
      "decidedAt": "2026-09-25T06:07:02.544Z",
      "recordedBy": "87d6b082-…",
      "evidenceAttachmentIds": [],
      "notes": "Approved verbally; recorded by service advisor.",
      "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 2, "totalPages": 1 }
}
```
`estimatedAmount`, `method`, `approvedByName`, `decidedAt`, `recordedBy`, `notes`, and the
`withdrawnAt`/`withdrawnBy`/`withdrawalReason` trio appear only when set. Every **APPROVED**
approval always has `estimatedAmount`; every **REJECTED** one always has `notes` (the reason).

### 12.2 Create an approval request — `POST /job-cards/{jobId}/approvals` → 201
**Service Advisor** (the initial quote, right after opening the job):
```json
{
  "scope": "INITIAL_WORK",
  "description": "Quote for front brake pads and rotor inspection.",
  "estimatedAmount": { "amount": "1200.0000", "currency": "EGP" },
  "workItemIds": ["<initial work item ids it covers — optional>"]
}
```
- `description` 3–1000 chars. `estimatedAmount` is optional here (it can be given when deciding).
- `workItemIds` (optional) may list the job's **initial** work items this quote covers.
- The branch's Service Advisors get a notification "approval needed" (§17).

The status starts as **PENDING**.

### 12.3 Record the customer's decision — `POST /job-cards/{jobId}/approvals/{approvalId}/decision` → 200 (Service Advisor)
```json
{
  "decision": "APPROVED",
  "method": "PHONE",
  "approvedByName": "Customer (phone confirmation)",
  "estimatedAmount": { "amount": "1200.0000", "currency": "EGP" },
  "notes": "Approved verbally.",
  "evidenceAttachmentIds": ["<APPROVAL_EVIDENCE uploads — optional, e.g. a signed form>"]
}
```
- `decision`: `APPROVED` or `REJECTED`. `method`: `IN_PERSON`, `PHONE`, `MESSAGE`, `EMAIL`,
  `SIGNED_FORM`. `approvedByName`: who decided on the customer's side (1–120 chars).
- **APPROVED needs an amount:** `estimatedAmount` — the amount quoted to the customer. If it was
  already given when the request was created you may leave it out; if neither → **422
  `VALIDATION_FAILED`** (`/estimatedAmount`, `REQUIRED`).
- **REJECTED needs a reason:** `notes` is required → else **422** (`/notes`, `REQUIRED`).
- Only a **PENDING** approval can be decided → else **409 `INVALID_STATE_TRANSITION`**.
- ⚠️ **Customer declines the initial scope:** rejecting the job's `INITIAL_WORK` (when no other
  initial approval is approved) **closes the job automatically** — RECEIVED → DELIVERED, no invoice.
  This is only allowed while the job is still **RECEIVED** (else 409 `JOB_STAGE_NOT_ALLOWED`) and
  no labor/parts were logged (else 409 `WORK_ALREADY_LOGGED`). **Show a confirm dialog:** "This
  closes the job and returns the vehicle without work. Continue?"
- The response is the updated approval.

### 12.4 Additional work (extra work found during the job)
1. **Technician** (on their own IN_PROGRESS job) — "Request additional work":
   `POST /job-cards/{jobId}/approvals` with
   ```json
   { "scope": "ADDITIONAL_WORK", "description": "Spark plugs found worn during inspection; customer approval needed." }
   ```
   The Technician may **only** use `ADDITIONAL_WORK` (else 422 `ADDITIONAL_WORK_ONLY`), must **not**
   send `estimatedAmount` (422 `NOT_ALLOWED` — the Service Advisor quotes it), and the job must be
   **IN_PROGRESS** (409 `JOB_STAGE_NOT_ALLOWED`). The Service Advisors are notified.
   (The Service Advisor may also raise an `ADDITIONAL_WORK` request the same way — same stage rule.)
2. **Service Advisor** calls the customer and records the decision (§12.3) — with the amount if
   approved.
3. If **APPROVED** → **Service Advisor** adds it as a work item: §10.5 **Add** with this
   `approvalId`. The Technician can now log labor/parts on that work item.
4. If **REJECTED** → nothing is added; no labor or parts may be logged for it.

An `ADDITIONAL_WORK` request never takes `workItemIds` (422 `NOT_ALLOWED`) — its work item is created
**after** the approval, in step 3.

### 12.5 Withdraw an approved initial scope — `POST /job-cards/{jobId}/approvals/{approvalId}/withdrawal` → 200 (Service Advisor)
When the customer **changes their mind** after approving, before any work:
```json
{ "reason": "Customer called back and cancelled — will do the repair elsewhere." }
```
- Only an **APPROVED `INITIAL_WORK`** approval (else 409 `INVALID_STATE_TRANSITION`).
- Same conditions as a decline: job still **RECEIVED** and nothing logged (409
  `JOB_STAGE_NOT_ALLOWED` / `WORK_ALREADY_LOGGED`).
- If no other initial approval remains approved, the job is **closed automatically**
  (RECEIVED → DELIVERED, no invoice). Confirm dialog, like §12.3.

### 12.6 Errors specific to approvals
| Status / code | Meaning |
|---|---|
| 422 `VALIDATION_FAILED` `/estimatedAmount` `REQUIRED` | Approving without any amount. |
| 422 `VALIDATION_FAILED` `/estimatedAmount` `NOT_ALLOWED` | A Technician sent an amount. |
| 422 `VALIDATION_FAILED` `/notes` `REQUIRED` | Rejecting without a reason. |
| 422 `VALIDATION_FAILED` `/scope` `ADDITIONAL_WORK_ONLY` | A Technician tried another scope. |
| 422 `VALIDATION_FAILED` `/workItemIds` `NOT_ALLOWED` / `WORK_ITEM_NOT_ELIGIBLE` | Work items on an additional-work request, or items that don't belong to the job. |
| 409 `INVALID_STATE_TRANSITION` | Deciding a non-PENDING approval; withdrawing something other than an approved initial scope. |
| 409 `JOB_STAGE_NOT_ALLOWED` | Additional work when the job is not IN_PROGRESS; decline/withdraw when the job is past RECEIVED. |
| 409 `WORK_ALREADY_LOGGED` | Decline/withdraw after labor or parts were logged. |
| 409 `ATTACHMENT_NOT_LINKABLE` | Evidence is not your own fresh APPROVAL_EVIDENCE upload (§18). |
| 404 `NOT_FOUND` | Job/approval not found — or a Technician's job that is not assigned to them. |

---

## 13. Work item progress — `PATCH /job-cards/{jobId}/work-items/{workItemId}` → 200

| Who | May send | Rule |
|---|---|---|
| the assigned **Technician** | `{ "status": "DONE" }` | job **IN_PROGRESS**, item **PENDING** |
| **Service Advisor** | `{ "status": "CANCELLED" }` and/or `{ "description": "…" }` | cancel only while IN_PROGRESS and the item is PENDING |

- A role sending a field it may not change → **403 `FORBIDDEN`**.
- Status change when the job is not IN_PROGRESS or the item is not PENDING → **409
  `INVALID_STATE_TRANSITION`** (a DONE item cannot be reopened).
- Anything on a DELIVERED job → 409 `JOB_STAGE_NOT_ALLOWED`.
- Returns the updated work item (§10.5 shape). Every work item must be DONE or CANCELLED before the
  job can go to Quality Check (§11).

---

## 14. Labor (Technician)

### 14.1 List — `GET /job-cards/{jobId}/labor-entries`
Readable by the Workshop Manager, the Quality Checker and the assigned Technician. Query: `page`,
`pageSize`, `status` (`ACTIVE`/`VOIDED`), `sort`.
```json
{
  "items": [
    {
      "id": "271ebe79-ec82-4dbe-8b04-29a7b8065ac6",
      "jobId": "7e6925c6-…",
      "workItemId": "998fdff3-a9bc-487d-9575-cde842cc7f22",
      "technicianId": "bedac36e-…",
      "workDate": "2026-09-25",
      "durationMinutes": 60,
      "description": "Work performed: Diagnose AC compressor fault",
      "hourlyRate": { "amount": "150.0000", "currency": "EGP" },
      "amount": { "amount": "150.0000", "currency": "EGP" },
      "status": "ACTIVE",
      "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 3, "totalPages": 1 }
}
```
⚠️ **`hourlyRate` is missing for the Technician** (they never see rates) — only the Workshop Manager
receives it. `amount` is always there. `voidReason`/`voidedAt`/`voidedBy` appear on a VOIDED entry.

### 14.2 Log labor — `POST /job-cards/{jobId}/labor-entries` → 201 (the assigned Technician)
```json
{ "workItemId": "998fdff3-a9bc-487d-9575-cde842cc7f22", "workDate": "2026-09-25", "durationMinutes": 60, "description": "Diagnosed compressor clutch fault." }
```
- `workDate` is date-only `"YYYY-MM-DD"`. `durationMinutes` 1–1440. `description` optional (≤500).
- `workItemId` optional; on an **additional-work** item, the customer must have approved it (§12.4).
- Job must be **IN_PROGRESS** (409 `JOB_STAGE_NOT_ALLOWED`) with the initial scope approved (409
  `CUSTOMER_APPROVAL_REQUIRED`).
- The server copies the labor rate onto the entry — the Technician never sends or sees it.

### 14.3 Correct a labor entry — `PATCH /job-cards/{jobId}/labor-entries/{laborEntryId}` → 200
```json
{ "durationMinutes": 45, "changeReason": "Logged 60 by mistake; actual time was 45 minutes." }
```
Fields: `workDate`, `durationMinutes`, `description`, and **`changeReason` (required, 3–500)**.
Only **your own ACTIVE** entry (someone else's → 404), and only while the job is **IN_PROGRESS** —
from Quality Check onward labor is **frozen** (409 `JOB_STAGE_NOT_ALLOWED`). If QC fails, the job is
back IN_PROGRESS and corrections are allowed again.

### 14.4 Void a labor entry — `POST /job-cards/{jobId}/labor-entries/{laborEntryId}/void` → 200
```json
{ "reason": "Logged on the wrong job." }
```
Same rules as 14.3. A voided entry stays in the list with `status: "VOIDED"` (nothing is deleted);
voiding it again → 409 `INVALID_STATE_TRANSITION`.

---

## 15. Parts on a job — reserve, issue, reverse

**Reserve** = "keep it for my job" (stock stays on the shelf, but nobody else can take it).
**Issue** = "I took it from the store" (stock goes down). **Reverse** = the Storekeeper undoes an
issue (for example the part was returned).

Pick the store and part from §19 (stores, parts, stock balances). The Technician can only use the
stores they are granted.

### 15.1 Reservations
**List — `GET /job-cards/{jobId}/part-reservations`** (Technician, Storekeeper, Workshop Manager):
```json
{
  "items": [
    { "id": "…", "jobId": "…", "partId": "…", "storeId": "…", "quantity": 2, "consumedQuantity": 0, "status": "ACTIVE", "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…" }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```
`status`: `ACTIVE` → `FULFILLED` (fully issued) or `RELEASED` (given back).

**Reserve — `POST /job-cards/{jobId}/part-reservations`** → 201 (the assigned Technician):
```json
{ "partId": "…", "storeId": "…", "quantity": 2 }
```
- Job **IN_PROGRESS** (409 `JOB_STAGE_NOT_ALLOWED`) with the initial scope approved (409
  `CUSTOMER_APPROVAL_REQUIRED`).
- Not enough **available** stock (on hand − already reserved) → **409 `INSUFFICIENT_STOCK`**.

**Release — `POST /job-cards/{jobId}/part-reservations/{reservationId}/release`** → 200 (no body).
Only **your own** ACTIVE reservation (someone else's → 404). Reservations still active when the job
is delivered are released automatically.

### 15.2 Issue a part — `POST /job-cards/{jobId}/part-issues` → 201 (the assigned Technician)
Send an **`Idempotency-Key`** header (a new UUID per click) so a retry never issues twice.
```json
{ "partId": "…", "storeId": "…", "quantity": 1, "workItemId": "<optional>", "reservationId": "<optional — consume your reservation>" }
```
- With `reservationId`, the reservation is consumed; without it, the part is taken from available
  stock.
- Same stage/approval rules as reserving. An additional-work `workItemId` needs its approval (§12.4).
- Not enough stock → 409 `INSUFFICIENT_STOCK`. A bad reservation → 409 `RESERVATION_INVALID`.
- The server copies the selling price and cost onto the issue.

**List — `GET /job-cards/{jobId}/part-issues`**:
```json
{
  "items": [
    {
      "id": "62dfc3b0-6f0c-4e3a-bb80-8df0f595f422", "jobId": "7e6925c6-…",
      "partId": "b842ff55-…", "partSku": "DEMO-PART-002", "storeId": "d96230e6-…",
      "quantity": 1, "reversedQuantity": 0,
      "unitPrice": { "amount": "180.0000", "currency": "EGP" },
      "unitCost": { "amount": "120.0000", "currency": "EGP" },
      "lineTotal": { "amount": "180.0000", "currency": "EGP" },
      "status": "ISSUED",
      "stockMovementId": "988fbadd-…",
      "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 2, "totalPages": 1 }
}
```
⚠️ `unitPrice` and `unitCost` are **missing for the Technician and the Quality Checker**.
`workItemId` / `reservationId` appear when set. `status`: `ISSUED`, `PARTIALLY_REVERSED`, `REVERSED`.

### 15.3 Reverse an issue — `POST /job-cards/{jobId}/part-issues/{partIssueId}/reversals` → 201 (Storekeeper)
Send an `Idempotency-Key` header too.
```json
{ "quantity": 1, "reason": "Part returned unused." }
```
- `reason` is required (3–500). Stock goes back up.
- Only while the job is **IN_PROGRESS** (409 `JOB_STAGE_NOT_ALLOWED`).
- More than what is still issued → 409 `REVERSAL_EXCEEDS_ISSUED`.
- Response:
  ```json
  { "id": "…", "partIssueId": "…", "quantity": 1, "reason": "Part returned unused.", "reversedBy": "…", "reversedAt": "…", "stockMovementId": "…", "partIssueStatus": "REVERSED" }
  ```

---

## 16. Quality check (Quality Checker)

The Quality Checker's job list shows only jobs **in QUALITY_CHECK** (§10.2).

### 16.1 Record the result — `POST /job-cards/{jobId}/quality-checks` → 201
```json
{
  "result": "PASSED",
  "notes": "All work items verified complete; no follow-up required.",
  "evidenceAttachmentIds": ["<QUALITY_EVIDENCE uploads — optional>"],
  "performedAt": "2026-09-25T09:30:00.000Z"
}
```
- **`PASSED`** → the job moves to **READY** and a **draft invoice** is created, in the same step.
- **`FAILED`** → the job goes **back to IN_PROGRESS** for rework; `notes` is **required** (422
  `/notes` `REQUIRED`) — it is the reason the Technician sees. The Technician is notified.
- `performedAt` (optional) = when the check was actually done; not in the future (422 `IN_FUTURE`).
  The server separately records `recordedAt`.
- The job must be in **QUALITY_CHECK** → else 409 `JOB_STAGE_NOT_ALLOWED`.
- A person who did technician work on this job (logged labor or issued parts) **cannot** check it
  → **409 `SEPARATION_OF_DUTIES_VIOLATION`**.
- After recording, reload the job — its stage has changed.

### 16.2 History — `GET /job-cards/{jobId}/quality-checks`
```json
{
  "items": [
    {
      "id": "f008a8e6-72b0-481c-8bb2-bd730997bead", "jobId": "7e6925c6-…",
      "result": "PASSED",
      "notes": "All work items verified complete; no follow-up required.",
      "evidenceAttachmentIds": ["65ce736b-9d81-45d3-8180-1bd3e03a6dcd"],
      "performedBy": "9474e97b-…",
      "performedAt": "2026-09-25T06:07:19.214Z",
      "recordedAt": "2026-09-25T06:07:19.214Z"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 1, "totalPages": 1 }
}
```
Quality checks can never be edited or deleted — a new check is a new row.

---

## 17. Notifications 🔔 (everyone)

The server creates a notification when something is **waiting for the user**. In this delivery:

| `eventType` | Who gets it | Open |
|---|---|---|
| `APPROVAL_NEEDED` | Service Advisors | the job's approvals (§12) — `entityType: "JOB_APPROVAL"`, `entityId` = the approval |
| `JOB_ASSIGNED` | the assigned Technician | `GET /job-cards/{entityId}` |
| `JOB_ENTERED_QUALITY_CHECK` | Quality Checkers (not anyone who worked on that job) | `GET /job-cards/{entityId}` |
| `QUALITY_CHECK_FAILED` | the assigned Technician | `GET /job-cards/{entityId}` |
| `JOB_READY_INVOICE_DRAFTED` | Service Advisors | `GET /job-cards/{entityId}` |
| `STOCK_ADJUSTMENT_SUBMITTED` | Workshop Managers (not its creator) | stock adjustments (§19.7) — `entityId` = the adjustment |
| `STOCK_ADJUSTMENT_DECIDED` | the adjustment's creator (Storekeeper) | stock adjustments (§19.7) |

(The contract lists four more types — purchase orders and assessments — they start arriving in later
deliveries. Show any unknown type with just its `message`.)

### 17.1 My notifications — `GET /notifications`
Query: `page`, `pageSize`, `unread=true` (only unread). Newest first. **Only your own** — every role.
```json
{
  "items": [
    {
      "id": "2944319c-ae01-4af2-a366-049a5dcf90cc",
      "eventType": "APPROVAL_NEEDED",
      "entityType": "JOB_APPROVAL",
      "entityId": "df30d197-7c35-4c01-9236-1328edc21ec6",
      "message": "INITIAL_WORK approval needed on job JC-2026-000006",
      "createdAt": "2026-09-25T06:07:29.825Z"
    }
  ],
  "page": { "page": 1, "pageSize": 20, "totalItems": 11, "totalPages": 1 }
}
```
- `readAt` appears once read. Show the unread count on the bell: `GET /notifications?unread=true&pageSize=1` → `page.totalItems`.
- Poll it every 30–60 seconds while the app is open (there is no push in this version).
- For `JOB_APPROVAL` notifications, the message contains the job number: open the job with
  `GET /job-cards?jobNumber=JC-2026-000006`, then its approvals tab.

### 17.2 Mark as read — `POST /notifications/{notificationId}/read` → 200
No body. Returns the notification with `readAt`. Calling it again is harmless. Someone else's id →
404.

Notifications are in-app only — no emails or SMS.

---

## 18. Attachments (photos and evidence)

Files are uploaded **first**, then **linked** to their record. An upload that is not linked within
**24 hours** expires.

### 18.1 Upload — `POST /attachments` → 201 — ⚠️ `multipart/form-data`, not JSON
Fields: `file` (the file) and `purpose`:

| `purpose` | Link it with |
|---|---|
| `JOB_PHOTO` | job creation `attachmentIds` (§10.1) or `POST /job-cards/{jobId}/attachments` (§18.3) |
| `APPROVAL_EVIDENCE` | a decision's `evidenceAttachmentIds` (§12.3) |
| `QUALITY_EVIDENCE` | a quality check's `evidenceAttachmentIds` (§16.1) |
| `TRAINING_EVIDENCE` | (training — later delivery) |

- Allowed: **JPEG, PNG, WebP, PDF**, max **10 MB**. The server checks the real content, not just the
  file name → wrong type **415 `UNSUPPORTED_MEDIA_TYPE`**; empty file 422 `EMPTY_FILE`.
- Too many uploads → 429 `RATE_LIMITED` (`Retry-After` header).
- Example with `fetch` (do **not** set `Content-Type` yourself — the browser adds the boundary):
  ```js
  const form = new FormData();
  form.append('file', fileInput.files[0]);
  form.append('purpose', 'JOB_PHOTO');
  const res = await fetch(`${API}/attachments`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  ```
- Response (status `UNLINKED` until linked):
  ```json
  {
    "id": "863d7b29-1212-4d79-976b-41b51b1d9d1b",
    "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…",
    "fileName": "job4-intake.png", "contentType": "image/png", "sizeBytes": 1033,
    "sha256": "5b579aa3…", "purpose": "JOB_PHOTO", "status": "UNLINKED"
  }
  ```
  After linking: `"status": "LINKED", "ownerType": "JOB_CARD", "ownerId": "<job id>"`.
- You can only link **your own** upload, with the right `purpose`, within 24 h — else **409
  `ATTACHMENT_NOT_LINKABLE`**.

### 18.2 Metadata — `GET /attachments/{attachmentId}` → the same shape
You can read an attachment only if you can read the record it belongs to (else 404).

### 18.3 Job photos
- **List — `GET /job-cards/{jobId}/attachments`** → `{ items: [attachment…], page }`.
- **Link — `POST /job-cards/{jobId}/attachments`** → 200 with the job's photo list:
  ```json
  { "attachmentIds": ["863d7b29-1212-4d79-976b-41b51b1d9d1b"] }
  ```
  (1–10 ids; Service Advisor, Technician on their job, Quality Checker.)

### 18.4 Showing / downloading a file — two steps
1. `POST /attachments/{attachmentId}/download-authorizations` → 201:
   ```json
   { "url": "https://…/api/v1/attachments/downloads/…?expires=…&sig=…", "expiresAt": "…" }
   ```
2. `GET` that `url` **with your `Authorization: Bearer` header** → the file bytes.

⚠️ Because step 2 needs the Bearer header, **`<img src={url}>` will not work**. Fetch it and use a
blob URL:
```js
const { url } = await apiFetch(`/attachments/${id}/download-authorizations`, { method: 'POST' });
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
const objectUrl = URL.createObjectURL(await res.blob());   // use this in <img src> or a download link
```
The URL works only for **you** and only for a short time — get a fresh one each time you show the
file. An expired/foreign URL answers 404.

---

## 19. Inventory

### 19.1 Stores — `GET /stores`
```json
{ "items": [ { "id": "d96230e6-…", "organizationScopeId": "…", "code": "DEMO-STORE-01", "name": "Main Parts Store", "status": "ACTIVE", "createdAt": "…", "updatedAt": "…" } ], "page": { … } }
```
Each user only sees the stores they are granted (the Technician usually one).

### 19.2 Parts catalog — `GET /parts`, `GET /parts/{partId}`
Query: `page`, `pageSize`, `q`, `sku`, `barcode`, `category`, `compatibleMake`, `compatibleModel`,
`status` (`ACTIVE`/`ARCHIVED`), `sort`.
```json
{
  "id": "b33ea408-54cd-44eb-b0ec-f412d113b6f0",
  "sku": "DEMO-PART-001",
  "name": { "en": "Oil Filter" },
  "category": "Filters",
  "unitOfMeasure": "EA",
  "sellingPrice": { "amount": "120.0000", "currency": "EGP" },
  "compatibility": [],
  "status": "ACTIVE",
  "version": 1,
  "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
}
```
- `sellingPrice` is **missing for the Technician**. `barcode` and `name.ar` appear when set.
  `compatibility` items: `{ "make", "model"?, "yearFrom"?, "yearTo"? }`.
- **Create — `POST /parts`** → 201 (Storekeeper):
  ```json
  { "sku": "BRK-PAD-FR-01", "barcode": "6221234567890", "name": { "en": "Front brake pads", "ar": "تيل فرامل أمامي" }, "category": "Brakes", "unitOfMeasure": "SET", "sellingPrice": { "amount": "650.0000", "currency": "EGP" }, "compatibility": [ { "make": "Toyota", "model": "Corolla", "yearFrom": 2018, "yearTo": 2023 } ] }
  ```
  `sku`: uppercase letters/digits/`.`/`_`/`-`, 2–64 chars. Duplicate SKU or barcode → 409
  `DUPLICATE_RESOURCE`. **Average cost is never typed** — it is calculated from goods receipts.
- **Edit — `PATCH /parts/{partId}`** — requires `version`; fields `barcode`, `name`, `category`,
  `sellingPrice`, `compatibility`, `status` (`ARCHIVED` to retire a part). The SKU cannot change.

### 19.3 Stock balances — `GET /stock-balances`
Query: `page`, `pageSize`, `q`, `storeId`, `partId`, `category`, **`belowMinimum=true`** (the stock
alerts), `stockedOut=true`, `sort`.
```json
{
  "storeId": "d96230e6-…", "partId": "b33ea408-…", "sku": "DEMO-PART-001",
  "partName": { "en": "Oil Filter" },
  "onHand": 19, "reserved": 0, "available": 19,
  "minLevel": 5, "maxLevel": 40,
  "averageCost": { "amount": "80.0000", "currency": "EGP" },
  "belowMinimum": false,
  "updatedAt": "…"
}
```
`available` = `onHand − reserved` (what can still be reserved/issued). `belowMinimum: true` = show
a **stock alert** badge. `averageCost` is missing for the Technician.

### 19.4 Min / max levels — `PUT /stock-balances/{storeId}/{partId}/levels` → 200 (Storekeeper)
```json
{ "minLevel": 5, "maxLevel": 40 }
```
`maxLevel` must be ≥ `minLevel` (422). Returns the balance.

### 19.5 Stock movements (the ledger) — `GET /stock-movements`
Query: `page`, `pageSize`, `from`, `to`, `storeId`, `partId`, `type`, `jobId`, `purchaseOrderId`,
`goodsReceiptId`, `stockAdjustmentId`, `sort`. Read-only — **nobody can create or edit a movement
directly**; every stock change creates one.
```json
{
  "id": "9b159511-…", "storeId": "…", "partId": "…",
  "type": "ADJUSTMENT",
  "onHandDelta": -2, "reservedDelta": 0, "onHandAfter": 38, "reservedAfter": 0,
  "unitCost": { "amount": "55.0000", "currency": "EGP" },
  "stockAdjustmentId": "7332be8e-…",
  "reason": "Stock adjustment (DAMAGE) - Note: Two spark plugs damaged in handling (demo data)",
  "actorId": "…", "occurredAt": "…"
}
```
`type`: `OPENING_BALANCE`, `RECEIPT`, `ISSUE`, `ISSUE_REVERSAL`, `RESERVATION`,
`RESERVATION_RELEASE`, `ADJUSTMENT`. The link fields (`jobId`, `partIssueId`, `purchaseOrderId`,
`goodsReceiptId`, `stockAdjustmentId`) and `reason` appear only when they apply.

**Reconciliation — `GET /stock-balances/reconciliation`** (optional `storeId`) — proves every
balance equals the sum of its movements:
```json
{ "generatedAt": "…", "checkedBalances": 6, "mismatchCount": 0, "reconciled": true, "mismatches": [] }
```

### 19.6 Stock counts (Storekeeper) — `POST /stock-counts` → 201, `GET /stock-counts`
When the Storekeeper physically counts a part on the shelf:
```json
{ "storeId": "…", "partId": "…", "countedQuantity": 38, "countedAt": "2026-09-25T08:00:00.000Z", "note": "Monthly count, shelf B3." }
```
The server records **the system quantity at that moment** next to what was counted:
```json
{
  "id": "52d9cc46-a408-4df2-8c63-b3db0bdd3854", "storeId": "…", "partId": "…",
  "systemQuantity": 40, "countedQuantity": 38,
  "countedAt": "2026-09-25T06:05:56.744Z", "recordedAt": "2026-09-25T06:05:56.744Z",
  "countedBy": "…", "note": "Physical count found two spark plugs damaged (demo data)"
}
```
- A count is recorded **even when nothing is different**. `countedAt` optional, not in the future.
- Counts never change stock by themselves. When `countedQuantity ≠ systemQuantity`, offer a
  button **"Create adjustment from this count"** (§19.7).

### 19.7 Stock adjustments — create (Storekeeper), approve/reject (Workshop Manager)
**List — `GET /stock-adjustments`** (query: `status` `PENDING_APPROVAL`/`APPROVED`/`REJECTED`,
`storeId`, `partId`):
```json
{
  "id": "7332be8e-9597-4daa-99a9-6f1a91e0a3b6",
  "storeId": "…", "partId": "…",
  "quantityDelta": -2,
  "reasonCode": "DAMAGE",
  "note": "Two spark plugs damaged in handling (demo data)",
  "status": "APPROVED",
  "decidedBy": "…", "decidedAt": "…",
  "stockMovementId": "9b159511-…",
  "stockCountId": "52d9cc46-…",
  "stockCount": { "id": "52d9cc46-…", "systemQuantity": 40, "countedQuantity": 38, "countedAt": "…", "countedBy": "…" },
  "createdAt": "…", "updatedAt": "…", "createdBy": "…", "updatedBy": "…"
}
```
The manager sees the **count behind the adjustment** right inside it (`stockCount`) — show it on
the approval screen.

**Create — `POST /stock-adjustments`** → 201 (Storekeeper; send an `Idempotency-Key` header):
```json
{ "storeId": "…", "partId": "…", "stockCountId": "52d9cc46-…", "reasonCode": "DAMAGE", "note": "Two spark plugs damaged in handling." }
```
- An adjustment **always comes from a stock count** of the same store and part, with a real
  difference, not used before → else **422 `STOCK_COUNT_NOT_USABLE`**.
- You do **not** send a quantity — it is `countedQuantity − systemQuantity` from the count.
- `reasonCode`: `DAMAGE`, `LOSS`, `FOUND`, `COUNT_CORRECTION`, `OTHER`.
- Stock does **not** change yet — status `PENDING_APPROVAL`; the Workshop Managers are notified.

**Decide — `POST /stock-adjustments/{adjustmentId}/decision`** → 200 (Workshop Manager):
```json
{ "decision": "REJECTED", "reason": "Count looks wrong — recount shelf B3 first." }
```
- `APPROVED` → stock changes now (one movement). `REJECTED` → closed, **no stock change**, and
  `reason` is **required** (3–500) → else 422 `/reason` `REQUIRED`.
- The Storekeeper who created it is notified.
- A manager cannot decide an adjustment **they created themselves** → 409
  `SEPARATION_OF_DUTIES_VIOLATION`.
- Already decided → 409 `INVALID_STATE_TRANSITION`. Approving would make stock negative → 409
  `INSUFFICIENT_STOCK`.

### 19.8 Errors specific to inventory
| Status / code | Meaning |
|---|---|
| 409 `INSUFFICIENT_STOCK` | Not enough available stock to reserve/issue, or an approval would go below zero. |
| 409 `CUSTOMER_APPROVAL_REQUIRED` | Reserving/issuing before the initial scope (or the additional work) is approved. |
| 409 `JOB_STAGE_NOT_ALLOWED` | Reserve/issue/reverse when the job is not IN_PROGRESS. |
| 409 `RESERVATION_INVALID` | The `reservationId` doesn't match this job/part/store or is not ACTIVE. |
| 409 `REVERSAL_EXCEEDS_ISSUED` | Reversing more than is still issued. |
| 409 `IDEMPOTENCY_CONFLICT` | Same `Idempotency-Key` reused for a different request. |
| 422 `STOCK_COUNT_NOT_USABLE` | Adjustment from a count of another store/part, with no difference, or already used. |
| 409 `SEPARATION_OF_DUTIES_VIOLATION` | A manager deciding their own adjustment. |
| 409 `DUPLICATE_RESOURCE` | Part SKU or barcode already exists. |
| 409 `VERSION_CONFLICT` | Part edited by someone else first. |
| 404 `NOT_FOUND` | Store/part/job not found or not in the caller's units; releasing someone else's reservation. |

---

## 19A. Audit log — `GET /audit-events`, `GET /audit-events/{auditEventId}`

For the **System Administrator** (everything) and the **Finance Viewer/Auditor** (only finance and
stock history: job stage changes, invoices/payments, stock movements, adjustments, purchase orders
and receipts — never training or student records). Read-only; nothing can be changed or deleted.

Query: `page`, `pageSize`, `from`, `to` (ISO, ending in `Z`), `actorUserId`, `action`, `entityType`,
`entityId`, `outcome` (`SUCCESS`/`DENIED`/`FAILED`), `sort` (default newest first).
```json
{
  "id": "fb4d6015-247d-4f31-b0c7-09eb85acce1d",
  "occurredAt": "2026-09-25T06:07:03.525Z",
  "actorUserId": "a9c65264-…",
  "actorRoles": ["WORKSHOP_MANAGER"],
  "action": "JOB_CARD.ASSIGN",
  "entityType": "JOB_CARD",
  "entityId": "7e6925c6-…",
  "outcome": "SUCCESS",
  "requestId": "d19594e1-…",
  "summary": "Assigned job JC-2026-000004",
  "changes": [
    { "field": "technicianId", "before": null, "after": "bedac36e-…" },
    { "field": "expectedCompletionAt", "before": "2026-09-26T06:06:58.102Z", "after": "2026-09-26T06:07:02.774Z" }
  ]
}
```
- `actorUserId`/`actorRoles` are absent for **system** actions (for example the nightly clean-up).
- `changes[].before` / `after` can be **any JSON type** (text, number, `null`, a list…) — display them
  as text.
- Passwords and tokens are never in the log. Reading the log is itself logged.
- A Finance Viewer asking for an entry outside their subset gets 404 (list: simply not included).

---

## 20. What is **NOT** final yet

Keep these screens on **mock data** — their contract comes in a later delivery:

- **Invoices and payments** (draft → issue → paid). ⚠️ This is why **Deliver** (§11) answers
  `INVOICE_REQUIRED` for new jobs until Part 3.
- **Purchasing**: vendors, purchase orders, approvals, goods receipts (and so average cost updates).
- **Training**: terms, courses, groups, students, sessions, attendance, assessments, certificates,
  mentors.
- **Dashboards, exports, predictions/AI**, and system configuration (tax rate etc.).

Everything in §4–§19A above **is** final and will not change without a new contract version.

---

## 21. Suggested build order

1. §3 menu + §17 notification bell (small, and every role sees it).
2. §4–§9 workshop setup screens (customers, vehicles, service types, bays, technicians, hours).
3. §10 job cards (create, list, detail) + §18 photos.
4. §12 approvals, then §10.6 assignment, then §11 stage buttons + §11.1 timeline.
5. Technician screens: §13 work items, §14 labor, §15 parts.
6. §16 quality check screen.
7. §19 inventory screens (Storekeeper, Workshop Manager), then §19A audit log.

---

## 22. Test checklist — do all of these before saying "done"

The demo data has six jobs: **JC-2026-000001** and **000002** delivered, **000003** READY (draft
invoice), **000004** delivered with extra work, **000005** RECEIVED waiting for approval, **000006**
declined and closed. `demo.tech1`…`demo.tech4` are the technicians of jobs 1–4.

⚠️ The demo jobs are **shared** — for anything that changes a job (approve, decline, start…), use a
**job you created yourself** (step 9), not the demo ones.

**Workshop setup (§4–§9)**

| # | Do this | Expected |
|---|---|---|
| 1 | Log in as `demo.advisor`, open Customers | List loads, search by name/phone works |
| 2 | Create a customer with only required fields | 201, appears in the list |
| 3 | Try to archive a customer with an open (non-delivered) job | 409 `RESOURCE_IN_USE`, clear message |
| 4 | Create a vehicle, then lower its `mileage` on edit | 422 `MILEAGE_LOWER_THAN_RECORDED` |
| 5 | Open vehicle `DEMO-001` | `serviceHistory` shows its delivered job |
| 6 | As `demo.advisor`, open Service Types | No labor rate anywhere; as `demo.manager` the rate shows |
| 7 | As manager, open a bay calendar for a 40-day range | 400 `BAD_REQUEST` (over 31 days) |
| 8 | As manager, edit operating hours with only 6 weekdays | 422 `MISSING_WEEKDAY` |

**The full job workflow (§10–§16) — do it with a new job**

| # | Do this | Expected |
|---|---|---|
| 9 | As advisor: upload a photo (`JOB_PHOTO`), then create a job with it and 2 work items | 201; the photo shows in the job's photos (§18.4 blob URL) |
| 10 | As advisor: create an `INITIAL_WORK` approval **without** an amount, then approve it **without** an amount | 422 `/estimatedAmount` `REQUIRED` |
| 11 | Approve it **with** an amount | Job shows `billableWorkAllowed: true` |
| 12 | As manager: assign a bay + a technician (e.g. `demo.tech2`) | 200; that technician gets a 🔔 `JOB_ASSIGNED` notification |
| 13 | As the **other** technician (`demo.tech3`): open that job | 404 (not their job) |
| 14 | As the assigned technician: **Start work** | Stage IN_PROGRESS |
| 15 | Log 30 minutes of labor on a work item | 201; the technician sees **no** `hourlyRate`, the manager does |
| 16 | Correct that labor without `changeReason` | 400 `BAD_REQUEST`; with a reason → 200 |
| 17 | **Send to quality check** while a work item is still PENDING | 409 `CHECKLIST_INCOMPLETE` |
| 18 | As technician: **Request additional work** with an amount | 422 `NOT_ALLOWED`; without → 201, advisor gets 🔔 |
| 19 | As advisor: approve it with an amount, then **Add as work item** | Work item with `isAdditionalWork: true` + `approvalId` |
| 20 | Add a second work item from the **same** approval | 422 `APPROVAL_NOT_USABLE` |
| 21 | As technician: reserve 1 part, then issue it with the `reservationId` | Reservation becomes FULFILLED; stock goes down |
| 22 | Reserve more than `available` | 409 `INSUFFICIENT_STOCK` |
| 23 | Mark every work item DONE, then **Send to quality check** | Stage QUALITY_CHECK; `demo.qc` gets 🔔 |
| 24 | Try to correct labor now | 409 `JOB_STAGE_NOT_ALLOWED` (frozen) |
| 25 | As `demo.qc`: record **FAILED** without notes | 422 `/notes` `REQUIRED` |
| 26 | Record **FAILED** with notes | Job back to IN_PROGRESS; technician gets 🔔 `QUALITY_CHECK_FAILED` |
| 27 | Send to QC again; as `demo.qc` record **PASSED** | Job READY; advisor gets 🔔 `JOB_READY_INVOICE_DRAFTED` |
| 28 | As advisor: **Deliver** | 409 `INVOICE_REQUIRED` (invoicing is Part 3) — show the message |
| 29 | Open the job's stage history | Full timeline, including the QC fail and the notes |

**Decline path (§12.3)**

| # | Do this | Expected |
|---|---|---|
| 30 | As advisor: create **another new job** + an `INITIAL_WORK` approval; **reject** it without notes | 422 `/notes` `REQUIRED` |
| 31 | Reject it **with** notes (after the confirm dialog) | The job becomes DELIVERED, "returned without work"; no invoice |

**Inventory (§19)**

| # | Do this | Expected |
|---|---|---|
| 32 | As `demo.tech1`: open parts and stock | No `sellingPrice` / `averageCost` shown |
| 33 | As `demo.storekeeper`: filter stock with `belowMinimum=true` | Stock-alert list |
| 34 | Record a stock count **equal** to the system quantity | 201, saved; "Create adjustment" not offered |
| 35 | Record a count that differs; create an adjustment from it | 201, `PENDING_APPROVAL`; managers get 🔔 |
| 36 | Create a second adjustment from the **same** count | 422 `STOCK_COUNT_NOT_USABLE` |
| 37 | As `demo.manager`: **reject** it without a reason | 422 `/reason` `REQUIRED`; with a reason → REJECTED, stock unchanged, storekeeper gets 🔔 |
| 38 | Open stock movements and the reconciliation | `reconciled: true` |

**Notifications, attachments, audit**

| # | Do this | Expected |
|---|---|---|
| 39 | Open the 🔔 as any user, mark one read | `readAt` appears; unread count goes down |
| 40 | Upload a `.txt` renamed to `.png` | 415 `UNSUPPORTED_MEDIA_TYPE` |
| 41 | Show a photo with `<img src={url}>` directly | Does **not** work — use the blob approach (§18.4) |
| 42 | As `demo.admin`: open the audit log, filter `action=JOB_CARD.ASSIGN` | Your assignment from step 12 with before/after changes |
| 43 | As `demo.finance`: open the audit log | Only finance/stock entries; no training entries |
| 44 | As `demo.advisor`: open the audit log | 403 `FORBIDDEN` |

---

## 23. When something does not work

Same as Part 1 §14: send the backend owner what you did, the endpoint + method, the status code
and **`requestId`**, and a screenshot (no passwords/tokens). Do not send passwords or tokens in
chat.

⚠️ This is a **shared test server** — please do not disable the demo accounts or change their
passwords/roles. Create your own test records.

---

## 24. What happens next

The next delivery (**Part 3**) covers **purchasing and invoices** (so **Deliver** works end to end),
with a new `wst-openapi-final.json` (v4). Training comes after that. Keep those screens on mock data
until then.
