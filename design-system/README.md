# WST Design System

Foundational tokens, type styles, and component library for the Workshop &
Training (WST) frontend.

> This is a project resource and documentation section. It is **not** a
> Workshop Manager feature and is not part of the application navigation.

- Version: `v1.0.0`
- Typeface: Inter (weights 400 / 500 / 600 / 700)
- CSS framework: Tailwind CSS v4
- Spacing scale: 4px base grid

## Contents

| File | Covers |
| ---- | ------ |
| `colors.md` | Color variables (base, text, accent, sidebar, status) |
| `typography.md` | Text styles (page title → table body) |
| `components.md` | Button, badge, input, card, and table components |
| `spacing.md` | Spacing scale and border-radius tokens |
| `icons.md` | Icon usage and navigation icon set |
| `guidelines.md` | Usage rules (effects, focus, RTL, do / don't) |

## CSS variable reference

```
--wst-space-4 / 8 / 12 / 16 / 20 / 24
--wst-radius-sm (8px) / -md (12px) / -full
--wst-shadow-card
--wst-focus-ring
```

Color tokens live in `@theme` as `--color-wst-*` and map to Tailwind utility
classes. Spacing and radius tokens are declared on `:root` and used via inline
`style` props or global CSS.
