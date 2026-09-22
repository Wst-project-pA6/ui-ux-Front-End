# WST Design System — Figma Import Pack

Exported from the WST frontend (`src/pages/DesignSystem.tsx`, `src/index.css`,
`src/components/ui/*`). One honest note first:

> **Figma's `.fig` format is proprietary binary and cannot be authored outside
> Figma.** There is no tool that writes a real `.fig` file. This folder is the
> standard importable equivalent: W3C design tokens + a step-by-step import
> guide. After import, publish it as a Figma library (`WST Design System`).

## Contents

| File | Purpose |
|---|---|
| `wst-design-tokens.json` | Full token set (W3C DTCG format): color, font, typography, spacing, radius, shadow + Button/Badge/Input/Card/Table/Modal specs + RTL rules |

## Option A — Tokens Studio for Figma (recommended, 5 minutes)

1. In Figma, install the **Tokens Studio for Figma** plugin.
2. Open the plugin → Settings → Sync providers → **JSON file / URL** → load
   `wst-design-tokens.json` (or paste its contents with **Import → File**).
3. Token sets map 1:1: `color/*`, `font/*`, `typography/*`, `spacing/*`,
   `radius/*`, `shadow/*`.
4. Apply tokens to fresh styles: select the token groups → **Create styles**
   (Color styles from `color/*`, Text styles from `typography/*`,
   Effect styles from `shadow/*`).
5. Publish the file as a team **Library** so all WST screens consume it.

## Option B — Native Figma Variables (no plugin)

1. Create a file `WST Design System` with two collections:
   - **WST / Color** — one variable per `color.*` token (paste hexes).
   - **WST / Number** — `spacing.*` and `radius.*` values.
2. **Text styles**: 8 styles from `typography.*` (Inter 400/500/600/700;
   Arabic styles use Noto Sans Arabic).
3. **Effect styles**: `card` and `focus-ring` from `shadow.*`.
4. **Components**: build variants from `component.*`:
   - Button (Primary/Secondary/Ghost/Danger/Disabled × sm/md/icon)
   - Badge (16 variants listed in the JSON — pill `9999px` + 6px dot)
   - Input (Default/Icon/Error/Disabled/Select/Textarea), Card, Table, Modal.

## RTL rule (WST-FR-02)

`dir=rtl` on `<html>` for Arabic; identifiers — job numbers, VINs, plates,
SKUs, amounts, phones — **always LTR** (`dir="ltr"`), never translated or
reordered. Documented in the JSON under `rtl`.

## Source of truth

The JSON mirrors the shipped code. If tokens change, edit the code first
(`index.css` custom properties + `components/ui/*`), then re-export here.
