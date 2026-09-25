# WST API — Guide for the Frontend (contract v3)

## Where things are

| What | Address |
|---|---|
| API base URL | `https://wst-backend-brg8e7dmawf0gne0.switzerlandnorth-01.azurewebsites.net/api/v1` |
| **Final contract v3** — finished endpoints only | `https://wst-backend-brg8e7dmawf0gne0.switzerlandnorth-01.azurewebsites.net/api/docs-final` |
| Full API — every endpoint, the rest still under review | `https://wst-backend-brg8e7dmawf0gne0.switzerlandnorth-01.azurewebsites.net/api/docs` |
| Contract files (OpenAPI 3) | `wst-openapi-final.json` (final) — also live at `/api/docs-final-json` (and the full one at `/api/docs-json`) |

**Build only against the final page.** Endpoints only on the full page may still change.

The contract is generated from the backend code, so it always matches what the server does. Every
operation on the final page documents its **request and its exact response body**. You can import
`wst-openapi-final.json` into Postman, or generate types from it (for example with
`openapi-typescript`).

### What is final in v3

- Signing in, sessions, passwords, user/role/unit administration, health (v1).
- Customers, vehicles and reminders, bays and the bay calendar, service types, technician profiles,
  operating hours (v2).
- **New in v3:** the whole job-card workflow (stages, customer approvals, work items, labor, part
  reservations/issues/reversals, quality checks), in-app notifications, attachments (upload,
  link, download), the audit log, and inventory (parts, stores, stock balances and movements,
  stock counts and adjustments).
- **Changed in v3:** `POST /job-cards/{jobId}/work-items` now needs `approvalId` and no longer
  accepts `isAdditionalWork` (see the Part 2 step-by-step, §10.5).
- **Not final yet:** purchasing, invoices and payments, training, dashboards, exports, predictions.

## Signing in

1. `POST /auth/login` with `{ "email": "...", "password": "..." }` → `{ accessToken, refreshToken, tokenType, expiresIn, mustChangePassword }`.
2. Send `Authorization: Bearer <accessToken>` on every other request.
3. The access token lives `expiresIn` seconds (10 minutes). Call `POST /auth/refresh` with
   `{ "refreshToken": "..." }` to get a **new pair**. Each refresh token works **once** — always keep
   the newest one. Reusing an old one ends the whole session.
4. A session also ends after **30 minutes without any refresh** — then the user logs in again.
5. `POST /auth/logout` with `{ "refreshToken": "..." }` ends the session immediately.
6. If login returns `mustChangePassword: true`, show a "change your password" screen first:
   `POST /auth/change-password` with `{ "currentPassword", "newPassword" }` (new password 12–128
   characters, different from the current one). Until then every other call answers
   **403 `PASSWORD_CHANGE_REQUIRED`**. After changing, log in again.
7. `GET /auth/me` returns the signed-in user, including `roles` and `permissions`.
   **Use `permissions` to decide which screens and buttons to show.** This is only for a good UI —
   the server enforces every rule itself.

There is **no sign-up screen and no "forgot password"**: only the System Administrator creates
accounts and resets passwords.

## Who may call what

Every operation in Swagger shows **Allowed roles** and the **Permissions (any of)** that grant it
(also machine-readable as `x-wst-roles` / `x-wst-permissions` in the contract). "Any signed-in
user" means every role may call it (for example your own notifications).

- A role that is not allowed gets **403 `FORBIDDEN`**.
- A record outside what the user may see (another unit, a job not assigned to a technician, a job
  not in Quality Check for a quality checker…) answers **404**, exactly as if it did not exist.
- Some fields are hidden from some roles: the **Technician never receives prices, labor rates or
  costs** (`sellingPrice`, `hourlyRate`, `unitPrice`, `unitCost`, `averageCost` are simply absent).

## Errors — always the same shape

```json
{ "code": "VALIDATION_FAILED", "message": "Validation failed", "requestId": "…", "details": [ … ] }
```

- Branch on `code`; show `message`; log `requestId` (the backend team needs it to trace a problem).
- A malformed request (missing or invalid field) answers **400 `BAD_REQUEST`** with the reason in
  `message`. A request that is well-formed but breaks a rule on a field answers **422
  `VALIDATION_FAILED`**, with the field problems in `details` as `{ field, code, message }`.
- A request that is valid but not allowed **in the record's current state** answers **409** with a
  specific code (for example `JOB_STAGE_NOT_ALLOWED`, `CUSTOMER_APPROVAL_REQUIRED`,
  `INSUFFICIENT_STOCK`).
- `429` (too many attempts) comes with a `Retry-After` header in seconds.

Common codes: `UNAUTHENTICATED` (401), `INVALID_CREDENTIALS` (401), `FORBIDDEN` (403),
`PASSWORD_CHANGE_REQUIRED` (403), `NOT_FOUND` (404), `BAD_REQUEST` (400), `VALIDATION_FAILED` (422),
`VERSION_CONFLICT` (409), `INVALID_STATE_TRANSITION` (409), `SEPARATION_OF_DUTIES_VIOLATION` (409),
`RATE_LIMITED` (429), `UNSUPPORTED_MEDIA_TYPE` (415). The Part 2 step-by-step lists every code per
screen.

## Lists

Lists accept `page` (default 1) and `pageSize` (default 20, max 100), and return:

```json
{ "items": [ … ], "page": { "page": 1, "pageSize": 20, "totalItems": 57, "totalPages": 3 } }
```

## Editing safely (version)

Records that can be edited carry a `version` number. Send the `version` you last read with an
update. If someone else changed the record meanwhile, the server answers **409
`VERSION_CONFLICT`** — reload the record and let the user retry.

## Retrying safely (Idempotency-Key)

These `POST`s accept an optional **`Idempotency-Key`** header (8–128 characters, e.g. a UUID you
generate per button click): issuing a part, reversing a part issue, creating a stock adjustment.
If the same request is retried with the same key (for example after a network error), it is done
**only once** and the first result is returned. The same key with a **different** body answers
**409 `IDEMPOTENCY_CONFLICT`**. Generate a new key for every new user action.

## Formats

- IDs are UUIDs. Dates and times are ISO-8601 in UTC (e.g. `2026-09-24T17:23:43.343Z`). Date-only
  fields (like a labor `workDate`) are `"YYYY-MM-DD"`.
- Money is an object `{ "amount": "150.0000", "currency": "EGP" }` — `amount` is a **string** with 4
  decimals; never parse it as a float for arithmetic.
- **File upload** (`POST /attachments`) is `multipart/form-data`, not JSON (see Part 2 §18).

## Demo accounts (test environment)

All use the `@demo.wst.local` domain. **Passwords are in `WST_Demo_Accounts.md`, sent with the
contract** — keep them out of code and out of any repository.

| Email | Role |
|---|---|
| demo.admin@demo.wst.local | System Administrator |
| demo.manager@demo.wst.local / demo.manager2@demo.wst.local | Workshop Manager |
| demo.advisor@demo.wst.local | Service Advisor |
| demo.tech1@ … demo.tech5@demo.wst.local | Technician |
| demo.qc@demo.wst.local | Quality Checker |
| demo.storekeeper@demo.wst.local | Storekeeper / Procurement |
| demo.mentor@ / demo.mentor2@ / demo.mentor3@demo.wst.local | Mentor |
| demo.supervisor@demo.wst.local | Training Supervisor |
| demo.student1@demo.wst.local / demo.student2@demo.wst.local | Student |
| demo.finance@demo.wst.local | Finance Viewer / Auditor |

The server is a shared **test** environment with fake data only.

## Calling the API from your frontend

Browsers block calls from other websites unless the backend allows them (CORS). **Send the backend
owner your frontend's exact URL** (for example `http://localhost:5173` for local development, or
your hosted URL) so it can be added.
