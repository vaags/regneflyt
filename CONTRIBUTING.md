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
- Update `CHANGELOG.md` for notable changes with release-level impact.
- Use [CONTRIBUTION_CHECKLISTS.md](docs/development/CONTRIBUTION_CHECKLISTS.md) as the execution checklist before opening or merging a PR.

## Changelog And Versioning

- Add ongoing changes under `Unreleased` using the existing Keep a Changelog
  categories.
- Include user-visible features and fixes, accessibility changes, removals,
  significant architecture or platform changes, and maintainer-facing workflow
  changes. Omit routine implementation details, formatting, tests-only
  maintenance, minor documentation edits, and non-notable internal refactors.
- One entry may summarize multiple related commits; write about outcomes rather
  than repeating commit subjects.
- When preparing a release, move the accumulated entries into a version heading
  dated with the current local date.
- Apply semantic versioning: patch for compatible fixes, minor for compatible
  functionality, and major for incompatible changes.
- Do not bump the version for each development commit. Bump it for a release or
  when a versioned change is explicitly requested.
- When bumping, update `package.json` and `package-lock.json` together. The
  top-level lockfile version and root package version must match `package.json`.
- A version bump must stage a changelog section for the new version.

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
4. For release-sensitive changes, run the relevant independent checks: `npm run test:unit:coverage`, `npm run test:e2e:full:production`, `npm run test:bundle`, and `npm run test:perf`.

## Pre-commit Hook

`npm install` points this repository's `core.hooksPath` at `.githooks`. The
pre-commit hook checks synchronized version metadata, requires a matching
changelog section for version bumps, and runs Prettier and ESLint on staged files
only; `npm run verify` remains the full gate. Bypass it with
`git commit --no-verify` only when a maintainer intentionally accepts those
omissions.

For any file with unstaged edits it validates the staged blob rather than the
working-tree copy, so what is checked is what the commit records. Prettier exits
0 on a parse error over stdin, so ESLint is what catches a syntax error there.
