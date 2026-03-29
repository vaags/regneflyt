---
description: 'Use when editing Playwright specs, keyboard/focus flows, accessibility checks, or end-to-end fixtures/helpers.'
applyTo: 'tests/e2e/**/*.ts,tests/helpers/a11yInvariants.ts'
---

# Regneflyt E2E And A11y Rules

- WCAG 2.2 AAA compliance is a hard requirement for user-facing implementations and related end-to-end validations.
- Preserve semantic roles, heading hierarchy, and keyboard-only navigation assumptions in tests.
- Prefer resilient selectors and role-based queries over brittle CSS selectors.
- Keep tests deterministic: avoid fixed sleeps and rely on explicit waits for visible, enabled, or navigated states.
- When changing flows under quiz/results/navigation/focus, run targeted Playwright specs for those flows.
- Keep ad-hoc output concise and prefer line/dot reporters, for example `npm run test:e2e -- --reporter=line`.
- Reuse shared helpers and fixtures in `tests/e2e/e2eHelpers.ts` and `tests/e2e/fixtures.ts` rather than duplicating setup logic.
