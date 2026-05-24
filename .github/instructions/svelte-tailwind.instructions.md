---
description: 'Use when editing Svelte components, route markup, Tailwind class lists, or component-level styling. Covers markup structure, inline classes, and avoiding class-string constants.'
name: 'Regneflyt Svelte Tailwind'
applyTo: 'src/routes/**/*.svelte,src/lib/components/**/*.svelte'
---

# Regneflyt Svelte And Tailwind Rules

- Prefer Tailwind or CSS class lists inline in markup instead of storing class strings in variables or constants, except in rare cases where reuse or conditional composition clearly justifies it.
- Preserve semantic HTML, keyboard accessibility, focus order, and heading structure in component markup.
- Avoid introducing component-local helpers or derived state when existing helpers, stores, or nearby patterns already fit.
- Keep component logic focused; move deterministic business logic into `src/lib/helpers` only when reuse or testability clearly justifies it.

## WCAG AAA Contrast Palette

All text must meet WCAG 2.2 AAA contrast ratios: **≥ 7 : 1** for normal text, **≥ 4.5 : 1** for large text (≥ 18 pt or ≥ 14 pt bold).

Use the three-tier hierarchy below. Do not use shades outside these tiers for text or icon colors.

### Light mode (on white / `bg-stone-100`)

| Tier | Class | Ratio on white | Use |
|------|-------|---------------|-----|
| Primary | `text-stone-900` | 19.4 : 1 | Headings, high-priority data |
| Secondary | `text-stone-700` | 10.3 : 1 | Labels, body text, values |
| Tertiary | `text-stone-600` | 7.6 : 1 | Hints, annotations, muted data |

### Dark mode (on `bg-stone-900`)

| Tier | Class | Ratio on stone-900 | Use |
|------|-------|-------------------|-----|
| Primary | `dark:text-stone-100` | 18.1 : 1 | Headings, high-priority data |
| Secondary | `dark:text-stone-200` | 15.1 : 1 | Labels, body text, values |
| Tertiary | `dark:text-stone-300` | 11.7 : 1 | Hints, annotations, muted data |

### Forbidden shades

- `text-stone-500` and below in light mode (< 7 : 1 on white).
- `dark:text-stone-400` and above in dark mode (6.9 : 1 on stone-900 — fails AAA).
- `text-sky-600` and below in light mode for links (< 7 : 1 on white). Use `text-sky-800` (7.6 : 1).

### Accent colors

| Purpose | Light | Dark |
|---------|-------|------|
| Positive | `text-green-900` | `dark:text-green-300` |
| Negative | `text-red-900` | `dark:text-red-300` |
| Links / actions | `text-sky-800` | `dark:text-sky-400` |

### Verification

Contrast helpers are available in `tests/helpers/a11yInvariants.ts` (`contrastRatio`, `parseRGB`) for computing exact WCAG ratios from computed styles in e2e tests.
