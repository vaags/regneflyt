---
description: 'Use when editing Playwright specs, e2e fixtures, keyboard navigation, focus management, results flow, heading hierarchy, or accessibility checks.'
name: 'Regneflyt E2E Accessibility'
applyTo: 'tests/e2e/**/*.ts,tests/helpers/a11yInvariants.ts'
---

# Regneflyt E2E And A11y Rules

- Preserve WCAG 2.2 AAA compliance for user-facing implementations and related end-to-end validations.
- Preserve semantic roles, heading hierarchy, and keyboard-only navigation assumptions in tests.
- Prefer resilient selectors and role-based queries over brittle CSS selectors.
- Keep tests deterministic. Avoid fixed sleeps and rely on explicit waits for visible, enabled, or navigated states.
- When changing flows under quiz/results/navigation/focus, run targeted Playwright specs for those flows.
- Keep ad-hoc output concise and prefer line/dot reporters, for example `npm run test:e2e -- --reporter=line`.
- Before running e2e specs, ensure Playwright browsers are installed with `npx playwright install`; for fast local validation prefer chromium only via `--project=chromium`.
- Reuse shared helpers and fixtures in `tests/e2e/e2eHelpers.ts` and `tests/e2e/fixtures.ts` rather than duplicating setup logic.
- A helper that samples colour, geometry, or computed style must return a named
  problem value when it cannot resolve one, never a substituted default. A
  fabricated value turns a failed measurement into a passing assertion.
- Measure colour by painting to a canvas and reading all four channels. Treat
  alpha below 255 as unresolved rather than flattening it, and clear the canvas
  between samples so translucency stays observable.
- Assert that injected test fixtures render as intended before measuring them.
  A fixture styled with app classes silently loses its styling if the app stops
  using them.
