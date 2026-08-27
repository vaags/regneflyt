---
description: 'Use when editing Svelte components, route markup, Tailwind class lists, or component-level styling. Covers markup structure, inline classes, and avoiding class-string constants.'
name: 'Regneflyt Svelte Tailwind'
applyTo: 'src/routes/**/*.svelte,src/lib/components/**/*.svelte'
---

# Regneflyt Svelte And Tailwind Rules

- Prefer Tailwind or CSS class lists inline in markup instead of storing class strings in variables or constants. Use class-string variables only when reuse or conditional composition clearly justifies it.
- Preserve semantic HTML, keyboard accessibility, focus order, and heading structure in component markup.
- Avoid introducing component-local helpers or derived state when existing helpers, stores, or nearby patterns already fit.
- Keep component logic focused. Move deterministic business logic into `src/lib/helpers` only when reuse or testability clearly justifies it.

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

## Non-text contrast

Focus indicators, control borders, and meaningful icons must meet WCAG 2.2
SC 1.4.11: **≥ 3 : 1** against adjacent colors.

- Use one of the focus utilities defined in `src/app.css`, chosen by the
  surface the control sits on. They are the only sanctioned focus styles.

| Surface | Utility |
|---------|---------|
| Stone page background | `focus-ring` |
| Alert or panel surface that already follows the theme | `focus-ring-surface` |
| Native form controls | `focus-ring-control` |
| Saturated sky update-notification surface | `focus-ring-inverse` |

- `btn-interactive-base` supplies ring width and offset for buttons, and each
  `btn-*` color utility supplies the hue. `btn-interactive-base` is emitted
  after the `btn-*` utilities at equal specificity, so it must never set a ring
  color; doing so silently overrides every per-color hue.
- Do not declare `focus-visible:ring-*` classes in component markup. A
  `no-restricted-syntax` ban in `eslint.config.js` enforces this, for both
  static class strings and values behind `class={...}`.
- The ring must contrast with the surface **outside** the offset, not only with
  the offset itself. A sky ring on a sky surface fails even when the ring-to-
  offset ratio passes.
- Do not introduce a focus ring without a ring offset. A ring drawn directly
  against a same-family surface fails 3 : 1 even when the ring color passes in
  isolation (`ring-sky-300` on `bg-stone-100` is ≈ 1.5 : 1). Use
  `ring-offset-transparent` when the surface itself provides the separation;
  the offset shadow paints over the ring, so the result is one solid ring.
- Light mode needs the `-700` shade of a hue; `-300` only clears 3 : 1 against
  the dark-mode `stone-900` offset.
- Never suppress the ring with an ancestor or self opacity. Pair a translucent
  control with `focus-visible:opacity-100`.
- `tests/e2e/wcag-regressions.spec.ts` tab-sweeps every route in both themes
  until focus wraps, computes the real ring-to-offset **and** ring-to-surface
  ratios, and fails any keyboard-reachable control that paints neither a ring
  nor an outline. It also
  measures each utility above against every surface listed for it via
  `FOCUS_UTILITY_FIXTURES`. Add a fixture entry when a utility gains a surface.

## Minimum interactive size

Interactive elements must present a **44 × 44 CSS px** target.

- Prefer real size: `min-h-11 min-w-11` or a `btn-size-*` utility.
- When visual density must be preserved (compact dismiss buttons, inline icon
  links), use the sanctioned hit-area expansion instead:

```
relative after:absolute after:top-1/2 after:left-1/2 after:min-h-11 after:min-w-11
after:-translate-x-1/2 after:-translate-y-1/2 after:content-['']
```

- `tests/e2e/touch-targets.spec.ts` understands both forms. It treats a
  `<label>` as part of the target only for checkboxes and radios, which a label
  click genuinely toggles. A `<select>` must meet the minimum on its own,
  because clicking its label focuses it without opening the option list.

### Verification

Contrast helpers are available in `tests/helpers/a11yInvariants.ts` (`contrastRatio`, `parseRGB`) for computing exact WCAG ratios from computed styles in e2e tests.
