# Components

## Button

Radius: `var(--wst-radius-sm)` (8px). Height 36px (sm: 28px).

| Variant | Foreground | Background | Use for |
| ------- | ---------- | ---------- | ------- |
| Primary | white | `#2563EB` → hover `#1D4ED8` | Main action per screen |
| Secondary | slate-700 | white, slate-200 border | Cancel, back, secondary |
| Ghost | blue-600 | blue-50 | Tertiary links |
| Danger | red-600 on red-50 | red-600 solid for destructive confirm | Delete, reject |
| Disabled | slate-400 on slate-100 | — | Unavailable actions |

Loading buttons show a spinner and are disabled. Submit buttons are disabled
until required input is valid.

## Badge / status chip

Pill shape (`var(--wst-radius-full)`), 12px semibold label, optional dot.
Semantic mapping: Received (blue), In Progress (amber), Quality Check
(purple), Ready / Pass / Healthy (green), Delivered / Draft (neutral),
Overdue / Fail / Out of Stock (red), Pending / Needs Improvement / Low Stock
(amber).

## Input

Height 36px, 14px text, slate-200 border, blue-500 focus ring. Variants:
default, with icon, error (red border + message), disabled, select, textarea.
Every input has a label; required fields show a red asterisk; validation
errors appear under the field.

## Card

Radius `var(--wst-radius-md)` (12px), shadow `var(--wst-shadow-card)`.
Variants: KPI, KPI accent (blue), info, alert/info (blue), alert/danger
(red), empty state (dashed border, centered illustration + guidance).

## Table

11px uppercase slate-400 headers, row hover (`bg-slate-50`), status badges in
cells, selectable rows highlight blue-50. Long tables paginate; empty results
show an explicit empty state with a clear-filters action.
