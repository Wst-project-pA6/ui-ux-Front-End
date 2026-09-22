ROLE

You are extending the EXISTING "WST — Workshop Management & Student
Practical Training" React + TypeScript + Tailwind (+ react-router)
application inside Figma Make. This is not a new build. Reuse the current
design system, the current shared components (Button, Input, Modal,
PageHeader), the current `LanguageContext`/`RoleContext`, and the current
visual language of `Login.tsx` (two-column branding layout on desktop,
single-column centered on mobile). Do not introduce new colors,
illustrations, or layout patterns outside the existing WST token system.

Everything you add must go through `t()` with real English and Arabic
entries in `translations.ts`, support RTL, and follow the same logical
Tailwind utilities (`start`/`end`, `ms`/`me`, `ps`/`pe`) already used
elsewhere in this codebase.

==================================================
1. LOGIN PAGE — SIMPLIFY
==================================================

- Remove the role-picker block entirely from `Login.tsx` (the
  "Prototype: select a role to preview" panel and its buttons).
- The role a user lands in must now be resolved from the email they type,
  not chosen manually. Resolve it by looking up the entered email against
  a demo user directory that includes:
  a) the existing seeded demo accounts (today's `DEMO_CREDENTIALS` map —
     keep these working), and
  b) any account created through the new Sign Up page (see section 2),
     persisted in `localStorage` under its own key, separate from
     `wst-role` and `wst-lang`.
- Keep two fields: Email, Password. Keep "Remember Me" and the language
  switcher as they are today.
- Validation before submit:
  - Email: required, valid email format, localized error.
  - Password: required, non-empty, localized error.
- On submit: look up the email in the demo directory.
  - If found: sign in as that user's stored role, call `setRole(...)`,
    navigate to that role's `homeRoute`, exactly like today's flow.
  - If not found, OR the password field is empty/invalid: show ONE
    generic localized error such as "Invalid email or password" — do not
    reveal whether the email exists in the system. This is a deliberate
    security choice (avoid user/account enumeration); keep it that way
    even though this is a demo.
- Turn "Forgot Password" into a real link/button that navigates to
  `/forgot-password` (see section 3) instead of being inert.
- Add a small link/line: "Don't have an account? Sign Up" →
  navigates to `/signup`.

==================================================
2. NEW PAGE — SIGN UP (`/signup`)
==================================================

Public route, outside `AppShell`/`ProtectedRoute`, same pattern as the
current `/` Login route. Reuse Login's branding panel on desktop; a
single centered column on mobile.

Fields, in this order:
1. Full Name — text, required, localized error if empty.
2. Role — move the role-picker UI you removed from Login here (same
   visual pattern: a bordered panel listing every role from
   `ALL_ROLES`/`ROLE_CONFIGS`, one selected at a time). This is the only
   place role selection now happens.
3. Email — required, valid email format. Also check it is not already
   used by an existing demo account (seeded or previously signed up);
   show a localized "An account with this email already exists" error.
4. Password — required, must satisfy the strength rules in section 4.
5. Confirm Password — required, must exactly match Password; show a
   localized mismatch error the moment the two diverge (on blur or on
   submit, not on every keystroke of the first field).

Submit behavior:
- Validate all fields; surface every error inline near its field, not
  only in a banner.
- On success: create the demo account (name, email, role) in the same
  local demo directory Login reads from, sign the user in immediately
  (`setRole(role)`), show a brief localized success state/toast, then
  navigate to that role's `homeRoute` — matching how Login currently
  behaves after submit.
- Add a link/line back to Login: "Already have an account? Sign In" →
  navigates to `/`.

==================================================
3. NEW PAGE — FORGOT PASSWORD (`/forgot-password`)
==================================================

Public route, same visual shell as Login/Sign Up (simple centered card is
fine; the two-column branding panel is optional here but keep it
consistent with Login if you include it).

Flow:
1. Single field: Email — required, valid email format.
2. On submit, regardless of whether the email exists in the demo
   directory, show the SAME generic localized confirmation message,
   e.g. "If an account exists for this email, a new password has been
   sent." This mirrors the anti-enumeration rule from section 1 — do not
   let this screen reveal whether an account exists.
3. Behind that generic message, since this prototype has no real email
   service:
   - If the email does exist in the demo directory, generate a new
     random temporary password (meeting the same strength rules as
     section 4) and overwrite the stored one for that demo account.
   - Reveal that generated password ONLY inside a clearly-labeled,
     visually distinct "Demo Mode — no email server connected" panel on
     this same screen (not silently, not via console.log). Label it
     explicitly as a stand-in for an email that a real backend would
     send, per WST-FR-01/out-of-scope notes — this must be obviously a
     development affordance, not something that would ship as-is.
   - If the email does not exist, show nothing in that panel — the outer
     generic message is the same either way.
4. Add a link back to Login: "Back to Sign In" → navigates to `/`.

==================================================
4. PASSWORD SECURITY — WHAT REACT CAN ACTUALLY GUARANTEE
==================================================

Be explicit with yourself about scope: a frontend-only React app cannot
provide real password security (that requires server-side hashing with
bcrypt/argon2, salting, secure transport, rate limiting, and a real
database — see WST-FR-01 and the SRS's own note that "React visibility is
not authorization" / "backend authorization is mandatory"). Implement
everything below, which is the part genuinely owned by the frontend, and
do NOT fake the rest:

DO implement:
- Strength rules enforced on both Sign Up and the demo password-reset
  flow: minimum 8 characters, at least one uppercase letter, one
  lowercase letter, one digit, and one special character. Show which
  rules are met/unmet live as the user types (checklist style, not just
  a pass/fail), localized.
- A strength meter (weak / fair / strong) that is communicated with TEXT
  plus color, never color alone — consistent with the app's existing
  accessibility rule.
- A show/hide toggle (eye icon) on every password field, with a proper
  `aria-label` that changes between "Show password" / "Hide password".
- Correct `autoComplete` attributes: `email` on the email field,
  `new-password` on Sign Up's Password/Confirm Password fields,
  `current-password` on Login's password field — this lets browser
  password managers behave correctly and is a real, meaningful security
  contribution from the frontend.
- No password value is ever logged, put in a URL, put in a toast, or
  rendered anywhere in the UI except inside its own masked field — with
  the one explicit, clearly-labeled exception of the "Demo Mode" panel
  described in section 3, which exists only because this prototype has
  no email backend.
- Client-side password fields are cleared from component state on
  unmount/navigation away, not retained longer than the flow needs.
- Reuse the shared `Input` component's `required`, `aria-invalid`, and
  `aria-describedby` wiring (already expected app-wide) for every new
  field in these three screens.

Do NOT implement:
- Do not "encrypt" or hash the password in the browser (e.g. with a
  JS crypto library and a hardcoded key) and call it secure storage —
  any key shipped in frontend code is not secret, and this creates a
  false sense of security. If you need to persist a demo password at
  all for the login-lookup simulation in section 1/2, store it as
  clearly-labeled demo/prototype data, not as something presented as
  production-grade encryption.
- Do not implement real rate-limiting/account-lockout logic client-side
  and present it as a security control — that belongs server-side. It's
  fine to leave a short code comment noting where it would plug in.

==================================================
5. LOCALIZATION & RTL
==================================================

- Add every new string (field labels, placeholders, validation messages,
  the password rule checklist, the strength labels, the demo-mode
  banner, both generic confirmation/error messages) as real `en`/`ar`
  pairs in `translations.ts` — no hardcoded literals, matching the same
  standard already required for the rest of the app.
- Both new pages must mirror correctly in RTL exactly like `Login.tsx`
  does today (form direction, icon placement in inputs, the branding
  panel if used).
- Verify at 1440px, 1024px and 390px in both languages: no horizontal
  overflow, no clipped validation text, comfortable touch targets on the
  role-picker buttons and the show/hide icon.

==================================================
6. ROUTING
==================================================

- Add `/signup` and `/forgot-password` as public routes in `App.tsx`,
  declared the same way as the existing `/` Login route (outside
  `AppShell`, not wrapped in `ProtectedRoute`).
- Do not change any existing protected route or role's `homeRoute`.

==================================================
VERIFICATION & REPORT
==================================================

Before finishing, confirm:
- Login no longer shows a role picker and correctly resolves role by
  email for both seeded and newly-signed-up accounts.
- Sign Up creates a working, immediately-usable account end to end.
- Forgot Password never reveals account existence outside the clearly
  labeled demo panel.
- All three screens pass the same EN/AR/RTL/responsive checklist as the
  rest of the app.

Finish with a short report: what was added/changed, which files were
touched, and any security caveat you deliberately left as
frontend-only/out-of-scope (per section 4) so it's not mistaken for a
production-ready auth system later.