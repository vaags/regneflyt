---
description: 'Use when editing Svelte components, route markup, or component-level styling. Covers markup structure, vanilla CSS ownership, and accessibility styling.'
name: 'Regneflyt Svelte CSS'
applyTo: 'src/routes/**/*.svelte,src/lib/components/**/*.svelte'
---

# Regneflyt Svelte And CSS Rules

- Prefer component-scoped `<style>` blocks for component-specific layout and presentation.
- Keep global CSS limited to document, form-control, theme, transition, accessibility, and deliberately shared surface policy.
- Do not use BEM prefixing (`block__element--modifier`) inside component `<style>` blocks. Prefer semantic HTML tags and native CSS nesting (`&`).
- Keep selectors flat with native CSS nesting: maximum 2 levels of nesting (e.g. `.block { & th, & td { ... } }` or `.block { & .local-class { ... } }`).
- Express visual state with native pseudo-classes, semantic attributes, or `data-*` attributes (e.g. `data-tone`, `data-compact`, `data-separated`) instead of appearance-oriented class-string maps or modifier class strings.
- Do not create atomic utility classes or a private replacement for Tailwind.
- Add shared custom properties only for theme-dependent semantic roles, audited accessibility contracts, or values intentionally shared by independent components.
- Preserve semantic HTML, keyboard accessibility, focus order, and heading structure in component markup.
- Avoid introducing component-local helpers or derived state when existing helpers, stores, or nearby patterns already fit.
- Keep component logic focused. Move deterministic business logic into `src/lib/helpers` only when reuse or testability clearly justifies it.

## WCAG AAA Contrast Palette

All text must meet WCAG 2.2 AAA contrast ratios: **≥ 7 : 1** for normal text, **≥ 4.5 : 1** for large text (≥ 18 pt or ≥ 14 pt bold).

Use the three-tier hierarchy below. Do not use shades outside these tiers for text or icon colors.

### Light mode (on white or the stone 100 page surface)

| Tier | Color | Ratio on white | Use |
|------|-------|---------------|-----|
| Primary | Stone 900 | 19.4 : 1 | Headings, high-priority data |
| Secondary | Stone 700 | 10.3 : 1 | Labels, body text, values |
| Tertiary | Stone 600 | 7.6 : 1 | Hints, annotations, muted data |

### Dark mode (on the stone 900 page surface)

| Tier | Color | Ratio on stone-900 | Use |
|------|-------|-------------------|-----|
| Primary | Stone 100 | 18.1 : 1 | Headings, high-priority data |
| Secondary | Stone 200 | 15.1 : 1 | Labels, body text, values |
| Tertiary | Stone 300 | 11.7 : 1 | Hints, annotations, muted data |

### Forbidden shades

- Stone 500 and lighter in light mode (< 7 : 1 on white).
- Stone 400 and darker in dark mode (stone 400 is 6.9 : 1 on stone 900 and fails AAA).
- Sky 600 and lighter in light mode for links (< 7 : 1 on white). Use sky 800 (7.6 : 1).

### Accent colors

| Purpose | Light | Dark |
|---------|-------|------|
| Positive | Green 900 | Green 300 |
| Negative | Red 900 | Red 300 |
| Links / actions | Sky 800 | Sky 400 |

## Non-text contrast

Focus indicators, control borders, and meaningful icons must meet WCAG 2.2
SC 1.4.11: **≥ 3 : 1** against adjacent colors.

- Use the shared `focus-indicator` primitive from `src/styles/accessibility.css`
  for custom controls. Native controls receive the same audited policy globally.

- Use `data-focus-inverse="true"` only on controls placed on the saturated
  update-notification surface. Use `data-focus-danger="true"` only for an
  error-state control whose indicator must use the danger token.
- The indicator must contrast with the surface outside the control. Do not
  suppress it through opacity or clipping.
- `tests/e2e/wcag-regressions.spec.ts` tab-sweeps every route in both themes
	until focus wraps, measures the real indicator against its surrounding surface,
	and fails any keyboard-reachable control that paints no resolvable indicator.
	It also exercises default and danger primitives plus the real inverse
	update-notification
	contexts. Update those fixtures when a new focus context is introduced.

## Minimum interactive size

Interactive elements must present a **44 × 44 CSS px** target.

- Prefer a real minimum block and inline size of 2.75rem or a shared button size.
- When visual density must be preserved (compact dismiss buttons, inline icon
  links), use the sanctioned hit-area expansion instead:

```css
position: relative;

&::after {
	position: absolute;
	top: 50%;
	left: 50%;
	min-block-size: 2.75rem;
	min-inline-size: 2.75rem;
	content: '';
	transform: translate(-50%, -50%);
}
```

- `tests/e2e/touch-targets.spec.ts` understands both forms. It treats a
  `<label>` as part of the target only for checkboxes and radios, which a label
  click genuinely toggles. A `<select>` must meet the minimum on its own,
  because clicking its label focuses it without opening the option list.

### Verification

Contrast helpers are available in `tests/helpers/a11yInvariants.ts` (`contrastRatio`, `parseRGB`) for computing exact WCAG ratios from computed styles in e2e tests.
