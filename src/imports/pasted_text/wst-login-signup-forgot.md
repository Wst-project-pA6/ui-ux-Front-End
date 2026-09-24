# WST — Auth Flow Extension Brief

**Project:** WST — Workshop Management & Student Practical Training  
**Stack:** React · TypeScript · Tailwind CSS v4 · react-router  
**Scope:** Extend, do not replace. Reuse the existing design system, shared components (`Button`, `Input`, `Modal`, `PageHeader`), `LanguageContext`, `RoleContext`, and `Login.tsx`'s visual shell (two-column branding on desktop, single centered column on mobile).

---

## Binding Constraints (apply to every change)

- All user-visible strings go through `t()` with real `en` / `ar` pairs in `translations.ts` — no hardcoded literals.
- Both new pages must mirror in RTL exactly as `Login.tsx` does today (form direction, icon placement in inputs, branding panel).
- Use logical Tailwind utilities (`start`/`end`, `ms`/`me`, `ps`/`pe`) — never physical `left`/`right`/`ml`/`mr`.
- Do not introduce new colors, illustrations, or layout patterns outside the existing WST token system.
- Do not change any existing protected route or any role's `homeRoute`.

---

## 1 · Login Page — Simplify (`/`)

### Remove
- The entire "Prototype: select a role to preview" role-picker panel and its buttons.

### Resolve Role from Email (not from a picker)
- On submit, look up the entered email against a **demo user directory** that merges:
  - **(a)** The existing seeded `DEMO_CREDENTIALS` map — keep these working unchanged.
  - **(b)** Any account created through the new Sign Up page, persisted in `localStorage` under its own key (separate from `wst-role` and `wst-lang`).
- If found and password is correct → call `setRole(resolvedRole)`, navigate to that role's `homeRoute`.
- If not found **or** password is empty/invalid → show ONE generic localized error: *"Invalid email or password."* Do not reveal whether the email exists. This is a deliberate anti-enumeration choice; preserve it even in demo mode.

### Fields & Controls

| Control | Type | Notes |
|---|---|---|
| Email | `<input type="email">` | Required; valid-email format check; localized inline error |
| Password | `<input type="password">` | Required; non-empty check; localized inline error; show/hide toggle (see §4) |
| Remember Me | Checkbox | Keep as-is |
| Language switcher | Existing component | Keep as-is |
| Forgot Password | Link/button | Navigate to `/forgot-password` (was inert — make it a real link) |
| "Don't have an account? Sign Up" | Inline link | New; navigates to `/signup` |

---

## 2 · New Page — Sign Up (`/signup`)

Public route, outside `AppShell` / `ProtectedRoute`. Same visual shell as Login (branding panel on desktop, single column on mobile).

### Fields (in order)

| # | Field | Type | Validation |
|---|---|---|---|
| 1 | Full Name | text | Required; localized error if empty |
| 2 | Role | Role picker | Move the removed Login role-picker UI here (same bordered panel listing every role from `ALL_ROLES` / `ROLE_CONFIGS`, one selected at a time). This is the **only** place role selection happens. |
| 3 | Email | email | Required; valid format; **not already used** by any seeded or previously signed-up account — localized "An account with this email already exists" error |
| 4 | Password | password | Required; must meet strength rules (§4); live checklist as user types; strength meter |
| 5 | Confirm Password | password | Required; must exactly match Password; show mismatch error **on blur or on submit** — not on every keystroke of the first field |

### Submit Behavior
1. Validate all fields; show every error inline near its field — not only in a banner.
2. On success: save the new account (name, email, role, password placeholder) to the `localStorage` demo directory → call `setRole(role)` → show a brief localized success toast → navigate to that role's `homeRoute`.
3. Add a link: *"Already have an account? Sign In"* → navigates to `/`.

---

## 3 · New Page — Forgot Password (`/forgot-password`)

Public route. Same visual shell as Login/Sign Up (simple centered card is fine; branding panel optional but consistent if used).

### Flow

**Step 1 — Input**
- Single field: Email — required, valid email format.

**Step 2 — Response (always the same visible message)**
- After submit, regardless of whether the email exists, display the identical generic localized confirmation: *"If an account exists for this email, a new password has been sent."*
- This is the anti-enumeration rule from §1 — the outer confirmation never reveals account existence.

**Step 3 — Demo affordance (conditionally shown)**
- If the email **does** exist in the demo directory:
  - Generate a random temporary password meeting the §4 strength rules.
  - Overwrite the stored password for that demo account.
  - Display the generated password in a visually distinct, clearly labeled **"Demo Mode — no email server connected"** panel on the same screen. This is an explicit development stand-in for a real email; it must look obviously non-production (distinct background, warning icon, explanatory copy).
- If the email does **not** exist: show nothing in the demo panel — the outer generic message is the same either way.

**Step 4**
- Link: *"Back to Sign In"* → navigates to `/`.

---

## 4 · Password Security — Frontend Scope

> Be explicit about what a React frontend can and cannot guarantee. A frontend-only app cannot provide real password security — that requires server-side hashing (bcrypt / argon2), salting, secure transport, rate limiting, and a real database (see WST-FR-01 and the SRS note: "React visibility is not authorization"). Implement what the frontend genuinely owns; do not fake the rest.

### DO Implement

| Item | Detail |
|---|---|
| Strength rules | Min 8 chars · ≥1 uppercase · ≥1 lowercase · ≥1 digit · ≥1 special char. Enforce on both Sign Up and the demo password-reset flow. |
| Live rule checklist | Show which rules are met/unmet as the user types (checklist style, localized). |
| Strength meter | Weak / Fair / Strong — communicated with **text + color**, never color alone (accessibility requirement). |
| Show/hide toggle | Eye icon on every password field; `aria-label` alternates between `"Show password"` / `"Hide password"`. |
| `autoComplete` attributes | `email` on email fields · `new-password` on Sign Up's Password + Confirm Password · `current-password` on Login's password field. Lets browser password managers behave correctly. |
| No password leakage | Password values must never appear in logs, URLs, toasts, or any UI surface other than their own masked field — with the single explicitly-labeled exception of the §3 Demo Mode panel. |
| State cleanup | Clear password fields from component state on unmount / navigation away. |
| Shared `Input` wiring | Use the shared `Input` component's `required`, `aria-invalid`, and `aria-describedby` wiring for every new field. |

### DO NOT Implement

| Item | Reason |
|---|---|
| Browser-side password hashing / "encryption" | Any key shipped in frontend code is not secret. Hashing in the browser with a hardcoded key creates a false sense of security without providing real protection. If persisting a demo password at all, store it as clearly labeled demo/prototype data — not as something presented as production-grade. |
| Client-side rate-limiting / account lockout | Belongs server-side. A short code comment noting the plug-in point is sufficient. |

---

## 5 · Routing

Add both new public routes to `App.tsx` **outside** `AppShell` and `ProtectedRoute`, declared the same way as the existing `/` Login route:

```
/signup          → <SignUp />
/forgot-password → <ForgotPassword />
```

Do not change any existing protected route.

---

## 6 · Localization & RTL

Add every new string as real `en` / `ar` pairs in `translations.ts`:

- Field labels and placeholders
- Inline validation messages (per field)
- Password rule checklist items
- Strength meter labels (Weak / Fair / Strong)
- Demo Mode banner heading and body copy
- Generic confirmation message (§3)
- "Sign Up" / "Sign In" cross-links on both pages

Verify at **1440 px**, **1024 px**, and **390 px** in both English and Arabic:

- [ ] No horizontal overflow
- [ ] Validation text not clipped at any breakpoint
- [ ] Role-picker buttons and show/hide icons meet 40 px minimum touch target
- [ ] Form direction and icon placement mirror correctly in RTL

---

## Verification Checklist

Before closing this pass, confirm:

- [ ] Login shows no role picker; role is resolved correctly from email for both seeded and newly-signed-up accounts
- [ ] Login never reveals whether a specific email exists in the system
- [ ] Sign Up creates an account that is immediately usable via Login
- [ ] Forgot Password never exposes account existence outside the clearly labeled Demo Mode panel
- [ ] Password strength rules and live checklist work on Sign Up and in the demo reset flow
- [ ] All three screens are fully localized (no hardcoded English literals)
- [ ] All three screens mirror correctly in RTL
- [ ] All three screens are responsive at 390 px / 1024 px / 1440 px
- [ ] `/signup` and `/forgot-password` are public routes (no `ProtectedRoute` wrap)
- [ ] No existing protected routes were altered

---

## Final Report Format

```
## Files Touched
- App.tsx: ...
- Login.tsx: ...
- translations.ts: ...
- [new] SignUp.tsx: ...
- [new] ForgotPassword.tsx: ...

## Changes by Section
- §1 Login: ...
- §2 Sign Up: ...
- §3 Forgot Password: ...
- §4 Password Security: ...
- §5 Routing: ...
- §6 Localization: ...

## Security Caveats (deliberately frontend-only / out of scope)
- [List each item from §4 "DO NOT" with a one-line note confirming it was not faked]
```
