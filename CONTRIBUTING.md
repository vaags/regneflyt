# Contributing

Thanks for contributing to Regneflyt.

This project prefers small, reviewable changes that preserve behavior unless a behavior change is explicitly requested.

## Start Here

1. Read the onboarding overview in [README.md](README.md).
2. Review state ownership guidance in [STORE_AND_CONTEXT_PATTERNS.md](STORE_AND_CONTEXT_PATTERNS.md).
3. Review helper placement guidance in [HELPER_DISCOVERY_AND_PLACEMENT.md](HELPER_DISCOVERY_AND_PLACEMENT.md).
4. Use contribution checklists and templates in [CONTRIBUTION_CHECKLISTS.md](CONTRIBUTION_CHECKLISTS.md).

## Core Expectations

- Preserve accessibility and keyboard navigation.
- Preserve i18n patterns and avoid hardcoded UI copy where translations are expected.
- Keep TypeScript strictness and avoid unnecessary weakening of types.
- Reuse existing helpers/stores/contexts before adding new abstractions.
- Add regression coverage for non-trivial behavior changes.

## Validation Commands

Run these based on scope:

1. Baseline checks:
   - `npm run check`
   - `npm run lint`
2. Logic changes:
   - `npm run test:unit -- --reporter=dot`
3. User-flow changes:
   - targeted Playwright with `npx playwright test --reporter=line <specs>`
