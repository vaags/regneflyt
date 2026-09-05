# Contributing

Thanks for contributing to Regneflyt.

This project prefers small, reviewable changes that preserve behavior unless a behavior change is explicitly requested.

## Start Here

1. Read the onboarding overview in [README.md](README.md).
2. Review state ownership guidance in [STORE_AND_CONTEXT_PATTERNS.md](docs/development/STORE_AND_CONTEXT_PATTERNS.md).
3. Review helper placement guidance in [HELPER_DISCOVERY_AND_PLACEMENT.md](docs/development/HELPER_DISCOVERY_AND_PLACEMENT.md).
4. Use contribution checklists and templates in [CONTRIBUTION_CHECKLISTS.md](docs/development/CONTRIBUTION_CHECKLISTS.md).

## Core Expectations

- Preserve accessibility, i18n patterns, and TypeScript strictness.
- Reuse existing helpers, stores, and contexts before adding new abstractions.
- Add regression coverage for non-trivial behavior changes.
- Use [CONTRIBUTION_CHECKLISTS.md](docs/development/CONTRIBUTION_CHECKLISTS.md) as the execution checklist before opening or merging a PR.

## Test Selector Policy

- Interaction actions in tests must target stable `data-testid` selectors.
  - Unit tests: use `getByTestId`/`findByTestId`/`queryByTestId` for `fireEvent` targets.
  - E2E tests: use `getByTestId` for action locators (`click`, `check`, `fill`, etc.).
- Semantic selectors like `getByRole` are still encouraged for assertions and accessibility expectations.
- Avoid CSS selector interactions (`locator('...').click()`), except when there is no viable stable test id and the selector targets non-interactive structure for inspection.

## Validation Commands

Use the scoped validation matrix in [CONTRIBUTION_CHECKLISTS.md](docs/development/CONTRIBUTION_CHECKLISTS.md) to choose commands for your change.

Confidence levels:

1. `npm run verify` for static checks plus unit and component tests.
2. `npm test` for standard integrated confidence: `verify`, comprehensive Chromium e2e, and Firefox/WebKit smoke coverage.
3. Run targeted Playwright specs for changed navigation, focus, accessibility, results, offline, or service-worker behavior.
4. Use `npm run test:release` for release certification; it builds once and includes coverage, production e2e, bundle budgets, and Lighthouse.

## Pre-commit Hook

`npm install` points this repository's `core.hooksPath` at `.githooks`. The
pre-commit hook runs Prettier and ESLint on staged files only; `npm run verify`
remains the full gate. Bypass it with `git commit --no-verify` when you need to.

For any file with unstaged edits it validates the staged blob rather than the
working-tree copy, so what is checked is what the commit records. Prettier exits
0 on a parse error over stdin, so ESLint is what catches a syntax error there.
