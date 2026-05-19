# ADR-004: Tech Stack Choices

**Status:** Accepted  
**Date:** 2026-05-15  
**Context:** Selecting frameworks and tools for a high-accessibility math training game with complex adaptive logic.

## Problem

Building a learning application requires balancing:

- **Accessibility:** WCAG 2.2 AAA compliance, keyboard navigation, screen reader support
- **Type Safety:** Complex adaptive logic must be bug-free
- **Testing:** Adaptive behavior must be empirically validated at scale
- **Internationalization:** Content in multiple languages
- **Development Velocity:** Small team, many features

## Decision

**Frontend Framework:** SvelteKit (not React, Vue, Angular)

- **Rationale:** Fine-grained reactivity (Svelte 5) makes state management simple without excessive stores. SSR enables i18n routing. File-based routing reduces scaffolding.
- **Accessibility fit:** Semantic HTML is default; ARIA can be added locally without abstraction layers.

**Language:** TypeScript (strict mode, no `any`)

- **Rationale:** Adaptive logic is complex (multipliers, penalty calculations, state transitions). Strict type checking catches bugs compile-time.
- **Constraints:** `strictNullChecks: true`, `noImplicitAny: true` enforced in tsconfig.json.

**Testing Framework:** Vitest (unit) + Playwright (e2e)

- **Vitest rationale:** Deterministic, fast, isolated. Puzzle generation seeded for reproducibility.
- **Playwright rationale:** Tests real browser behavior (keyboard, focus, ARIA). Accessibility primitives (a11yInvariants.ts) validate WCAG invariants.

**Internationalization:** Inlang Paraglide

- **Rationale:** Compile-to-static-files; no runtime dictionary lookups. Hardcoded string detection prevents accidental i18n gaps.
- **Constraint:** No user-visible strings in code; all strings in messages/\*.json.

**Styling:** Tailwind CSS + semantic HTML

- **Rationale:** Inline classes are faster to modify than component-scoped CSS. Semantic HTML (button, nav, form) provides accessibility baseline.
- **Constraint:** No class-string constants; inline Tailwind classes only.

**Deployment:** Vercel (serverless functions + CDN)

- **Rationale:** SSR at edge. Progressive Web App support via service worker. Analytics integration.

## Consequences

**Positive:**

- Accessibility first: semantic HTML + fine-grained reactivity = accessible by default
- Type safety: strict TypeScript catches adaptive logic bugs early
- Deterministic testing: seeded RNG + isolated test suites allow regression detection
- i18n coverage: compile-time checks ensure all strings translated
- Small bundle: no large framework overhead; ~45KB gzipped JS

**Negative:**

- Svelte ecosystem is smaller: fewer third-party components, libraries
- TypeScript strict mode slows onboarding: requires understanding type system
- Playwright tests are slower than unit tests: but worth it for accessibility validation
- Paraglide requires discipline: team must never hardcode strings

**Mitigation:**

- CONTRIBUTING.md documents setup and validation commands
- HELPER_DISCOVERY_AND_PLACEMENT.md guides pure function extraction
- STORE_AND_CONTEXT_PATTERNS.md clarifies state ownership
- ADAPTIVE_ALGORITHM.md documents complex domain logic
- Test fixtures and utilities (e2eHelpers.ts, component-setup.ts) reduce test boilerplate
