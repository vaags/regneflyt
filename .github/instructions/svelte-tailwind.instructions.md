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
