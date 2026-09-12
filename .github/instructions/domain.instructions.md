---
description: 'Use when editing framework-neutral training-domain code.'
name: 'Regneflyt Domain Boundary'
applyTo: 'src/lib/domain/**/*.ts'
---

# Regneflyt Domain Boundary

- Organize code by business responsibility: arithmetic, skill progression, puzzle generation, and quiz behavior.
- Keep domain modules independent of Svelte, SvelteKit, Paraglide, browser globals, stores, contexts, routes, components, and Vite environment flags.
- Import domain dependencies from canonical `#lib/domain/**` paths. Do not import compatibility files under `src/lib/helpers`, `src/lib/models`, or `src/lib/constants`.
- Keep calculation APIs direct and deterministic. Inject time or randomness only where behavior varies.
- Preserve RNG call order when moving or changing puzzle-generation logic.
- Avoid dependency containers, service locators, broad barrels, and runtime registries.
- Keep user-facing labels and formatting in integration or UI modules.
- Run `npm run check:domain`, targeted domain tests, `npm run verify`, and `npm run test:bundle` after non-trivial domain changes.