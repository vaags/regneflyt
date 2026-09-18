# ADR-005: Vanilla CSS Ownership

**Status:** Accepted  
**Date:** 2026-09-17  
**Supersedes:** The styling decision in ADR-004

## Context

Regneflyt used Tailwind CSS as a compile-time utility generator. The production
CSS was already small, so removing Tailwind is primarily a toolchain and source
ownership decision rather than a JavaScript runtime optimization.

Tailwind also coupled styling to the Vite pipeline, Prettier, editor extensions,
repository instructions, and accessibility tests that inspected framework-owned
custom properties.

## Decision

Use browser-native CSS and Svelte scoped styles without a CSS framework or CSS
preprocessor.

- Keep document, form-control, accessibility, theme, and view-transition policy
  in `src/app.css` or focused files imported by it.
- Prefer component-scoped `<style>` blocks for component-specific layout and
  presentation.
- Represent visual state with native pseudo-classes, semantic attributes, or
  `data-*` attributes instead of constructing appearance-oriented class lists.
- Keep global reusable classes limited to cross-component policies such as focus
  indicators, visually hidden content, audited surfaces, and expanded hit areas.
- Use semantic custom-property names for shared theme and accessibility values.
- Preserve the existing WCAG 2.2 AAA contrast, forced-colours, reduced-motion,
  and 44 by 44 CSS pixel target contracts.

The migration is complete. `src/app.css` imports the small global policy layer:
tokens, reset, base document behavior, native form controls, document-level
transitions, and accessibility primitives. Reusable components and routes own
their presentation in scoped Svelte styles.

## Consequences

### Positive

- Removes Tailwind, its Vite integration, its Prettier integration, and editor
  coupling.
- Removes the framework compiler and the generated compatibility stylesheet from
  the build and source tree.
- Allows component style ownership to converge on Svelte's native scoping.
- Keeps accessibility measurements tied to application-owned contracts.

### Negative

- Developers must maintain responsive and state selectors directly.
- CSS regressions require the same cross-browser and accessibility validation as
  component markup changes.

## Guardrails

- Do not create a general atomic utility framework.
- Do not add palette or spacing tokens without a shared semantic purpose.
- Keep component-specific presentation in the component or route that owns its
  markup. Share semantic custom properties, not atomic utility classes.
- Measure production CSS after each migration and keep it at or below the
  documented bundle budget.
