# Icons

Stroke icons (1.75px stroke, round caps/joins, 18px in navigation, 14–16px
inline). Each navigation section has a distinct outline glyph:

Dashboard (grid), Customers (users), Vehicles (truck), Job Cards (file),
Inventory (package), Purchasing (shopping bag), Training (graduation cap),
Assessments (check-square), Competencies (medal), Reports (bar chart),
AI Insights (robot/spark), Settings (gear), Role Matrix (grid-table),
My Jobs (clipboard-check), My Training (cap), Invoices (receipt).

Rules:

- Never use emoji as the sole carrier of meaning in production UI.
- Status is always conveyed by color + label, never color alone.
- Icons are decorative duplicates of adjacent text labels for screen readers
  (`aria-hidden` where appropriate) unless they are the only content, in
  which case the button carries an accessible label.
