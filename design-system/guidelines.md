# Guidelines

## Interaction

- Every button performs a real action: navigate, open a dialog, mutate state
  via the API (or explicit local persistence), or export a file. No
  `console.log`-only or `alert`-only controls.
- Destructive actions (delete, deactivate, reject) always confirm first.
- Mutations show loading, then success or the real error — never a fake
  success. Offline saves are labeled as local/demo explicitly.
- Hover, focus-visible, active, and disabled states are required on all
  controls. Focus uses `--wst-focus-ring`.

## Forms

- Required fields are marked and validated before submit; invalid data
  cannot be submitted. Errors name the field and the fix.
- Submit shows a spinner and disables the form; cancel/close never
  destroys data without confirmation when dirty.

## States

Loading (skeleton or spinner), empty (illustration + guidance + action),
error (message + retry), and success (toast) states are mandatory for every
data surface.

## RTL / bilingual

- Layout mirrors for Arabic; identifiers (job numbers, VINs, plates, SKUs,
  amounts) stay LTR via `dir="ltr"`.
- English and Arabic strings ship together in `src/i18n/translations.ts`.

## Permissions

- The frontend hides what a role cannot use, but authorization is enforced
  by the backend. Hiding a button is not access control.
- The permission matrix is documented for supervisors at Role Matrix and
  must mirror backend separation-of-duties rules.
